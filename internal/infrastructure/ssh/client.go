package ssh

import (
	"context"
	"fmt"
	"net"
	"time"

	gossh "golang.org/x/crypto/ssh"
	"github.com/zyhnesmr/next-terminal/internal/domain"
)

type Dialer struct {
	mfaRegistry *MFAChallengeRegistry
}

func NewDialer() *Dialer {
	return &Dialer{}
}

func (d *Dialer) SetMFARegistry(registry *MFAChallengeRegistry) {
	d.mfaRegistry = registry
}

func (d *Dialer) Dial(ctx context.Context, conn *domain.Connection, password string, privateKey []byte, keyPassphrase string) (*gossh.Client, error) {
	authMethods, err := BuildAuthMethods(password, privateKey, keyPassphrase)
	if err != nil {
		return nil, err
	}

	// Add MFA keyboard-interactive if needed
	sessionID := ctx.Value("sessionID").(string)
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
		Config: gossh.Config{
			KeyExchanges: []string{
				"curve25519-sha256",
				"curve25519-sha256@libssh.org",
				"ecdh-sha2-nistp256",
				"ecdh-sha2-nistp384",
				"ecdh-sha2-nistp521",
				"diffie-hellman-group-exchange-sha256",
				"diffie-hellman-group14-sha256",
				"diffie-hellman-group14-sha1",
			},
		},
	}

	addr := fmt.Sprintf("%s:%d", conn.Host, conn.Port)

	var dialer net.Dialer
	netConn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to %s: %w", addr, err)
	}

	sshConn, chans, reqs, err := gossh.NewClientConn(netConn, addr, config)
	if err != nil {
		netConn.Close()
		return nil, fmt.Errorf("failed to establish SSH connection: %w", err)
	}

	client := gossh.NewClient(sshConn, chans, reqs)

	if conn.KeepAliveInterval > 0 {
		go keepAlive(client, time.Duration(conn.KeepAliveInterval)*time.Second)
	}

	return client, nil
}

// DialSimple is a direct dial without MFA support, used for jump host connections.
func (d *Dialer) DialSimple(ctx context.Context, conn *domain.Connection, password string, privateKey []byte, keyPassphrase string) (*gossh.Client, error) {
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

	var dialer net.Dialer
	netConn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to %s: %w", addr, err)
	}

	sshConn, chans, reqs, err := gossh.NewClientConn(netConn, addr, config)
	if err != nil {
		netConn.Close()
		return nil, fmt.Errorf("failed to establish SSH connection: %w", err)
	}

	client := gossh.NewClient(sshConn, chans, reqs)

	if conn.KeepAliveInterval > 0 {
		go keepAlive(client, time.Duration(conn.KeepAliveInterval)*time.Second)
	}

	return client, nil
}

func keepAlive(client *gossh.Client, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		_, _, err := client.SendRequest("keepalive@golang.org", true, nil)
		if err != nil {
			return
		}
	}
}
