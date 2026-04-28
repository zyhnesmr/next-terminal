package terminal

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"sync"

	gossh "golang.org/x/crypto/ssh"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type SSHSessionBridge struct {
	ID           string
	ConnectionID string
	Client       *gossh.Client
	Session      *gossh.Session
	ctx          context.Context
	cancel       context.CancelFunc
	onOutput     func(data []byte)
	onError      func(err error)
	stdinWriter  io.Writer
	done         chan struct{}
	once         sync.Once
}

func NewSSHSessionBridge(ctx context.Context, id string, connectionID string, client *gossh.Client) *SSHSessionBridge {
	childCtx, cancel := context.WithCancel(ctx)
	return &SSHSessionBridge{
		ID:           id,
		ConnectionID: connectionID,
		Client:       client,
		ctx:          childCtx,
		cancel:       cancel,
		done:         make(chan struct{}),
	}
}

func (b *SSHSessionBridge) Start(terminalType string, rows, cols uint16, onOutput func(data []byte), onError func(err error)) error {
	b.onOutput = onOutput
	b.onError = onError

	session, err := b.Client.NewSession()
	if err != nil {
		return fmt.Errorf("failed to create SSH session: %w", err)
	}
	b.Session = session

	modes := gossh.TerminalModes{
		gossh.ECHO:          1,
		gossh.TTY_OP_ISPEED: 14400,
		gossh.TTY_OP_OSPEED: 14400,
	}

	if err := session.RequestPty(terminalType, int(rows), int(cols), modes); err != nil {
		session.Close()
		return fmt.Errorf("failed to request PTY: %w", err)
	}

	stdinPipe, err := session.StdinPipe()
	if err != nil {
		session.Close()
		return fmt.Errorf("failed to get stdin pipe: %w", err)
	}

	stdoutPipe, err := session.StdoutPipe()
	if err != nil {
		session.Close()
		return fmt.Errorf("failed to get stdout pipe: %w", err)
	}

	stderrPipe, err := session.StderrPipe()
	if err != nil {
		session.Close()
		return fmt.Errorf("failed to get stderr pipe: %w", err)
	}

	if err := session.Shell(); err != nil {
		session.Close()
		return fmt.Errorf("failed to start shell: %w", err)
	}

	b.stdinWriter = stdinPipe

	go b.readPump(stdoutPipe)
	go b.readPump(stderrPipe)
	go b.wait()

	slog.Info("SSH session started", "id", b.ID, "connectionID", b.ConnectionID)
	return nil
}

func (b *SSHSessionBridge) Write(data []byte) error {
	if b.stdinWriter == nil {
		return fmt.Errorf("session not started")
	}
	_, err := b.stdinWriter.Write(data)
	return err
}

func (b *SSHSessionBridge) Resize(rows, cols uint16) error {
	if b.Session == nil {
		return fmt.Errorf("session not active")
	}
	return b.Session.WindowChange(int(rows), int(cols))
}

func (b *SSHSessionBridge) Close() error {
	var err error
	b.once.Do(func() {
		b.cancel()
		if b.Session != nil {
			err = b.Session.Close()
		}
		if b.Client != nil {
			b.Client.Close()
		}
		close(b.done)
		slog.Info("SSH session closed", "id", b.ID)
	})
	return err
}

func (b *SSHSessionBridge) Done() <-chan struct{} {
	return b.done
}

func (b *SSHSessionBridge) readPump(reader io.Reader) {
	buf := make([]byte, 4096)
	for {
		select {
		case <-b.ctx.Done():
			return
		default:
		}

		n, err := reader.Read(buf)
		if n > 0 && b.onOutput != nil {
			b.onOutput(buf[:n])
		}
		if err != nil {
			if b.ctx.Err() == nil && b.onError != nil {
				b.onError(err)
			}
			return
		}
	}
}

func (b *SSHSessionBridge) wait() {
	err := b.Session.Wait()
	if err != nil && b.ctx.Err() == nil {
		slog.Warn("SSH session ended with error", "id", b.ID, "error", err)
		if b.onError != nil {
			b.onError(err)
		}
	}
	b.Close()
}

// WailsEventBridge sends terminal I/O through Wails events
type WailsEventBridge struct {
	ctx context.Context
}

func NewWailsEventBridge(ctx context.Context) *WailsEventBridge {
	return &WailsEventBridge{ctx: ctx}
}

func (w *WailsEventBridge) OnOutput(sessionID string, data []byte) {
	runtime.EventsEmit(w.ctx, "terminal:"+sessionID+":output", string(data))
}

func (w *WailsEventBridge) OnError(sessionID string, err error) {
	slog.Error("terminal session error", "sessionID", sessionID, "error", err)
	runtime.EventsEmit(w.ctx, "terminal:"+sessionID+":error", err.Error())
}
