package ssh

import (
	"context"
	"fmt"
	"time"

	gossh "golang.org/x/crypto/ssh"
	"github.com/zyhnesmr/next-terminal/internal/domain"
)

// DialWithJump establishes a chain of SSH connections through jump hosts
// to reach the final target, equivalent to OpenSSH ProxyJump.
func (d *Dialer) DialWithJump(ctx context.Context, conn *domain.Connection, authProvider CredentialProvider) (*gossh.Client, error) {
	jumpIDs, err := ParseJumpHostIDs(conn.JumpHostIDs)
	if err != nil {
		return nil, fmt.Errorf("invalid jump host IDs: %w", err)
	}
	if len(jumpIDs) == 0 {
		return nil, fmt.Errorf("no jump hosts specified")
	}

	var currentClient *gossh.Client

	for i, jumpID := range jumpIDs {
		jumpConn, password, privateKey, keyPassphrase, err := authProvider.Resolve(ctx, jumpID)
		if err != nil {
			if currentClient != nil {
				currentClient.Close()
			}
			return nil, fmt.Errorf("failed to resolve jump host %s: %w", jumpID, err)
		}

		if i == 0 {
			currentClient, err = d.DialSimple(ctx, jumpConn, password, privateKey, keyPassphrase)
			if err != nil {
				return nil, fmt.Errorf("failed to connect to jump host %s: %w", jumpConn.Name, err)
			}
		} else {
			nextClient, err := dialViaClient(currentClient, jumpConn, password, privateKey, keyPassphrase)
			if err != nil {
				currentClient.Close()
				return nil, fmt.Errorf("failed to jump to %s: %w", jumpConn.Name, err)
			}
			currentClient = nextClient
		}
	}

	// Resolve target credentials
	_, password, privateKey, keyPassphrase, err := authProvider.Resolve(ctx, conn.ID)
	if err != nil {
		currentClient.Close()
		return nil, fmt.Errorf("failed to resolve target credentials: %w", err)
	}

	// Build auth methods for target, including MFA if needed
	sessionID, _ := ctx.Value("sessionID").(string)
	var authMethods []gossh.AuthMethod

	authMethods, err = BuildAuthMethods(password, privateKey, keyPassphrase)
	if err != nil {
		currentClient.Close()
		return nil, err
	}

	if IsMFAAuth(domain.AuthMethod(conn.AuthMethod)) && d.mfaRegistry != nil && sessionID != "" {
		mfaCallback := d.mfaRegistry.CreateCallback(sessionID)
		authMethods = append(authMethods, gossh.KeyboardInteractive(mfaCallback))
	}

	timeout := time.Duration(conn.ConnectionTimeout) * time.Second
	if timeout == 0 {
		timeout = 10 * time.Second
	}

	config := &gossh.ClientConfig{
		User:            conn.Username,
		Auth:            authMethods,
		HostKeyCallback: gossh.InsecureIgnoreHostKey(),
		Timeout:         timeout,
	}

	addr := fmt.Sprintf("%s:%d", conn.Host, conn.Port)
	netConn, err := currentClient.Dial("tcp", addr)
	if err != nil {
		currentClient.Close()
		return nil, fmt.Errorf("failed to dial target %s: %w", addr, err)
	}

	sshConn, chans, reqs, err := gossh.NewClientConn(netConn, addr, config)
	if err != nil {
		netConn.Close()
		currentClient.Close()
		return nil, fmt.Errorf("failed to establish SSH connection to target %s: %w", addr, err)
	}

	return gossh.NewClient(sshConn, chans, reqs), nil
}

func dialViaClient(client *gossh.Client, conn *domain.Connection, password string, privateKey []byte, keyPassphrase string) (*gossh.Client, error) {
	authMethods, err := BuildAuthMethods(password, privateKey, keyPassphrase)
	if err != nil {
		return nil, err
	}

	timeout := time.Duration(conn.ConnectionTimeout) * time.Second
	if timeout == 0 {
		timeout = 10 * time.Second
	}

	config := &gossh.ClientConfig{
		User:            conn.Username,
		Auth:            authMethods,
		HostKeyCallback: gossh.InsecureIgnoreHostKey(),
		Timeout:         timeout,
	}

	addr := fmt.Sprintf("%s:%d", conn.Host, conn.Port)
	netConn, err := client.Dial("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("failed to dial %s via jump host: %w", addr, err)
	}

	sshConn, chans, reqs, err := gossh.NewClientConn(netConn, addr, config)
	if err != nil {
		netConn.Close()
		return nil, fmt.Errorf("failed to establish SSH connection to %s: %w", addr, err)
	}

	return gossh.NewClient(sshConn, chans, reqs), nil
}

// CredentialProvider resolves connection credentials
type CredentialProvider interface {
	Resolve(ctx context.Context, connectionID string) (conn *domain.Connection, password string, privateKey []byte, keyPassphrase string, err error)
}
