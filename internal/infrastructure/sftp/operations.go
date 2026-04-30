package sftp

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/zyhnesmr/next-terminal/internal/domain"
)

type FileInfo struct {
	Name    string
	Path    string
	IsDir   bool
	Size    int64
	ModTime int64
	Mode    string
}

func toFileInfo(path string, stat os.FileInfo) FileInfo {
	return FileInfo{
		Name:    stat.Name(),
		Path:    path,
		IsDir:   stat.IsDir(),
		Size:    stat.Size(),
		ModTime: stat.ModTime().Unix(),
		Mode:    stat.Mode().String(),
	}
}

func (c *Client) ReadDir(path string) ([]FileInfo, error) {
	entries, err := c.client.ReadDir(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory %s: %w", path, err)
	}

	result := make([]FileInfo, 0, len(entries))
	for _, entry := range entries {
		fullPath := filepath.Join(path, entry.Name())
		result = append(result, toFileInfo(fullPath, entry))
	}
	return result, nil
}

func (c *Client) Stat(path string) (*FileInfo, error) {
	stat, err := c.client.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("failed to stat %s: %w", path, err)
	}
	info := toFileInfo(path, stat)
	return &info, nil
}

func (c *Client) Mkdir(path string) error {
	return c.client.Mkdir(path)
}

func (c *Client) Remove(path string) error {
	return c.client.Remove(path)
}

func (c *Client) Rename(oldPath, newPath string) error {
	return c.client.Rename(oldPath, newPath)
}

// Upload copies a local file to the remote path, calling progress for each chunk written.
func (c *Client) Upload(localPath, remotePath string, progress func(bytesTransferred int64, total int64)) error {
	localFile, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open local file: %w", err)
	}
	defer localFile.Close()

	stat, err := localFile.Stat()
	if err != nil {
		return fmt.Errorf("failed to stat local file: %w", err)
	}
	totalSize := stat.Size()

	remoteFile, err := c.client.Create(remotePath)
	if err != nil {
		return fmt.Errorf("failed to create remote file: %w", err)
	}
	defer remoteFile.Close()

	buf := make([]byte, 32768)
	var transferred int64

	for {
		n, readErr := localFile.Read(buf)
		if n > 0 {
			written, writeErr := remoteFile.Write(buf[:n])
			if writeErr != nil {
				return fmt.Errorf("failed to write remote file: %w", writeErr)
			}
			transferred += int64(written)
			if progress != nil {
				progress(transferred, totalSize)
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return fmt.Errorf("failed to read local file: %w", readErr)
		}
	}

	return nil
}

// Download copies a remote file to the local path, calling progress for each chunk written.
func (c *Client) Download(remotePath, localPath string, progress func(bytesTransferred int64, total int64)) error {
	remoteStat, err := c.client.Stat(remotePath)
	if err != nil {
		return fmt.Errorf("failed to stat remote file: %w", err)
	}
	totalSize := remoteStat.Size()

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return fmt.Errorf("failed to create local directory: %w", err)
	}

	remoteFile, err := c.client.Open(remotePath)
	if err != nil {
		return fmt.Errorf("failed to open remote file: %w", err)
	}
	defer remoteFile.Close()

	localFile, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %w", err)
	}
	defer localFile.Close()

	buf := make([]byte, 32768)
	var transferred int64

	for {
		n, readErr := remoteFile.Read(buf)
		if n > 0 {
			written, writeErr := localFile.Write(buf[:n])
			if writeErr != nil {
				return fmt.Errorf("failed to write local file: %w", writeErr)
			}
			transferred += int64(written)
			if progress != nil {
				progress(transferred, totalSize)
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return fmt.Errorf("failed to read remote file: %w", readErr)
		}
	}

	return nil
}

// ToDomainFileEntry converts a FileInfo to a domain.FileEntry.
func ToDomainFileEntry(info FileInfo) *domain.FileEntry {
	return &domain.FileEntry{
		Name:    info.Name,
		Path:    info.Path,
		IsDir:   info.IsDir,
		Size:    info.Size,
		ModTime: info.ModTime,
		Mode:    info.Mode,
	}
}
