package domain

type TransferStatus string

const (
	TransferStatusPending    TransferStatus = "pending"
	TransferStatusInProgress TransferStatus = "in_progress"
	TransferStatusCompleted  TransferStatus = "completed"
	TransferStatusFailed     TransferStatus = "failed"
	TransferStatusCancelled  TransferStatus = "cancelled"
)

type FileEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime int64  `json:"modTime"`
	Mode    string `json:"mode"`
}

type FileTransfer struct {
	ID           string         `json:"id"`
	LocalPath    string         `json:"localPath"`
	RemotePath   string         `json:"remotePath"`
	IsUpload     bool           `json:"isUpload"`
	Status       TransferStatus `json:"status"`
	BytesTransferred int64      `json:"bytesTransferred"`
	TotalBytes   int64          `json:"totalBytes"`
	Error        string         `json:"error,omitempty"`
}
