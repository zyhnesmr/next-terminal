package ssh

import (
	"context"
	"fmt"
	"net"
	"time"

	gossh "golang.org/x/crypto/ssh"
	"github.com/zyhnesmr/next-terminal/internal/domain"
)

type Dialer struct{}

func NewDialer() *Dialer {
	return &Dialer{}
}

func (d *Dialer) Dial(ctx context.Context, conn *domain.Connection, password string, privateKey []byte, keyPassphrase string) (*gossh.Client, error) {
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

	// Set up keep-alive
	if conn.KeepAliveInterval > 0 {
		go keepAlive(client, time.Duration(conn.KeepAliveInterval)*time.Second)
	}

	return client, nil
}

func (d *Dialer) DialWithJump(ctx context.Context, conn *domain.Connection, jumps []*JumpConfig) (*gossh.Client, error) {
	if len(jumps) == 0 {
		return nil, fmt.Errorf("no jump hosts specified")
	}

	// Connect to the first jump host directly
	var currentClient *gossh.Client
	var err error

	for i, jump := range jumps {
		if i == 0 {
			currentClient, err = d.Dial(ctx, jump.Connection, jump.Password, jump.PrivateKey, jump.KeyPassphrase)
			if err != nil {
				return nil, fmt.Errorf("failed to connect to jump host %s: %w", jump.Connection.Name, err)
			}
		} else {
			nextClient, err := jumpViaClient(currentClient, jump.Connection, jump.Password, jump.PrivateKey, jump.KeyPassphrase)
			if err != nil {
				currentClient.Close()
				return nil, fmt.Errorf("failed to jump to %s: %w", jump.Connection.Name, err)
			}
			currentClient = nextClient
		}
	}

	// Connect to the final target through the last jump host
	targetClient, err := jumpViaClient(currentClient, conn, "", nil, "")
	if err != nil {
		currentClient.Close()
		return nil, fmt.Errorf("failed to connect to target %s: %w", conn.Name, err)
	}

	return targetClient, nil
}

func jumpViaClient(client *gossh.Client, conn *domain.Connection, password string, privateKey []byte, keyPassphrase string) (*gossh.Client, error) {
	authMethods, err := BuildAuthMethods(password, privateKey, keyPassphrase)
	if err != nil {
		return nil, err
	}

	config := &gossh.ClientConfig{
		User:            conn.Username,
		Auth:            authMethods,
		HostKeyCallback: gossh.InsecureIgnoreHostKey(),
		Timeout:         time.Duration(conn.ConnectionTimeout) * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", conn.Host, conn.Port)
	conn2, err := client.Dial("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("failed to dial %s via jump host: %w", addr, err)
	}

	sshConn, chans, reqs, err := gossh.NewClientConn(conn2, addr, config)
	if err != nil {
		conn2.Close()
		return nil, fmt.Errorf("failed to establish SSH connection to %s: %w", addr, err)
	}

	return gossh.NewClient(sshConn, chans, reqs), nil
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

type JumpConfig struct {
	Connection *domain.Connection
	Password   string
	PrivateKey []byte
	KeyPassphrase string
}
