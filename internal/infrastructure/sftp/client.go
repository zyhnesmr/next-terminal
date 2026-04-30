package sftp

import (
	"fmt"

	gossh "golang.org/x/crypto/ssh"
	sftp "github.com/pkg/sftp"
)

// Client wraps an sftp.Client opened on an existing SSH connection.
type Client struct {
	client *sftp.Client
}

// NewClient opens an SFTP subsystem on an existing SSH client.
// The SFTP session reuses the SSH connection (no second auth required).
func NewClient(sshClient *gossh.Client) (*Client, error) {
	sftpClient, err := sftp.NewClient(sshClient)
	if err != nil {
		return nil, fmt.Errorf("failed to open SFTP subsystem: %w", err)
	}
	return &Client{client: sftpClient}, nil
}

func (c *Client) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}

func (c *Client) SFTP() *sftp.Client {
	return c.client
}
