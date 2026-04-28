package domain

type AppSettings struct {
	Theme          string `json:"theme"`
	FontFamily     string `json:"fontFamily"`
	FontSize       int    `json:"fontSize"`
	DefaultShell   string `json:"defaultShell"`
	Scrollback     int    `json:"scrollback"`
	CursorStyle    string `json:"cursorStyle"`
	CursorBlink    bool   `json:"cursorBlink"`
	CopyOnSelect   bool   `json:"copyOnSelect"`
	ConfirmOnClose bool   `json:"confirmOnClose"`
}

func DefaultSettings() *AppSettings {
	return &AppSettings{
		Theme:          "dracula",
		FontFamily:     "Menlo",
		FontSize:       14,
		Scrollback:     10000,
		CursorStyle:    "block",
		CursorBlink:    true,
		CopyOnSelect:   false,
		ConfirmOnClose: true,
	}
}

type ThemeInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
