package ssh

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const mfaResponseTimeout = 60 * time.Second

type MFAChallenge struct {
	SessionID string
	Prompts   []MFAChallengePrompt
	Response  chan []string
}

type MFAChallengePrompt struct {
	Name     string
	Instruction string
	Prompt   string
	Echo     bool
}

// MFAChallengeRegistry tracks pending MFA challenges indexed by session ID.
// When an SSH server requires keyboard-interactive auth, the callback
// emits a Wails event to the frontend and blocks until a response arrives
// or the timeout expires.
type MFAChallengeRegistry struct {
	pending map[string]*MFAChallenge
	mu      sync.RWMutex
	ctx     context.Context
}

func NewMFAChallengeRegistry(ctx context.Context) *MFAChallengeRegistry {
	return &MFAChallengeRegistry{
		pending: make(map[string]*MFAChallenge),
		ctx:     ctx,
	}
}

// CreateCallback returns a keyboard-interactive callback function for the given session.
// The callback emits an MFA challenge event to the frontend and waits for a response.
func (r *MFAChallengeRegistry) CreateCallback(sessionID string) func(user, instruction string, questions []string, echos []bool) ([]string, error) {
	return func(user, instruction string, questions []string, echos []bool) ([]string, error) {
		if len(questions) == 0 {
			return nil, nil
		}

		prompts := make([]MFAChallengePrompt, len(questions))
		for i, q := range questions {
			prompts[i] = MFAChallengePrompt{
				Name:        fmt.Sprintf("prompt_%d", i),
				Instruction: instruction,
				Prompt:      q,
				Echo:        echos[i],
			}
		}

		challenge := &MFAChallenge{
			SessionID: sessionID,
			Prompts:   prompts,
			Response:  make(chan []string, 1),
		}

		r.mu.Lock()
		r.pending[sessionID] = challenge
		r.mu.Unlock()

		// Emit MFA challenge to frontend
		runtime.EventsEmit(r.ctx, "auth:mfa-required", map[string]interface{}{
			"sessionId":   sessionID,
			"user":        user,
			"instruction": instruction,
			"prompts":     prompts,
		})

		slog.Info("MFA challenge sent to frontend", "sessionID", sessionID, "prompts", len(questions))

		// Wait for response or timeout
		select {
		case responses := <-challenge.Response:
			r.mu.Lock()
			delete(r.pending, sessionID)
			r.mu.Unlock()
			slog.Info("MFA response received", "sessionID", sessionID)
			return responses, nil
		case <-time.After(mfaResponseTimeout):
			r.mu.Lock()
			delete(r.pending, sessionID)
			r.mu.Unlock()
			slog.Warn("MFA response timed out", "sessionID", sessionID)
			return nil, fmt.Errorf("MFA response timed out after %v", mfaResponseTimeout)
		}
	}
}

// SubmitResponse is called when the frontend sends back MFA responses.
func (r *MFAChallengeRegistry) SubmitResponse(sessionID string, responses []string) error {
	r.mu.RLock()
	challenge, ok := r.pending[sessionID]
	r.mu.RUnlock()

	if !ok {
		return fmt.Errorf("no pending MFA challenge for session %s", sessionID)
	}

	select {
	case challenge.Response <- responses:
		return nil
	default:
		return fmt.Errorf("MFA challenge response channel full")
	}
}

// HasPendingChallenge checks if a session has a pending MFA challenge.
func (r *MFAChallengeRegistry) HasPendingChallenge(sessionID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	_, ok := r.pending[sessionID]
	return ok
}
