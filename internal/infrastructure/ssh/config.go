package ssh

import (
	"encoding/json"

	"github.com/zyhnesmr/next-terminal/internal/domain"
)

func ParseJumpHostIDs(jumpHostIDs string) ([]string, error) {
	if jumpHostIDs == "" {
		return nil, nil
	}

	var ids []string
	if err := json.Unmarshal([]byte(jumpHostIDs), &ids); err != nil {
		return nil, err
	}
	return ids, nil
}

func IsKeyAuth(method domain.AuthMethod) bool {
	return method == domain.AuthMethodKey || method == domain.AuthMethodKeyMFA
}

func IsPasswordAuth(method domain.AuthMethod) bool {
	return method == domain.AuthMethodPassword || method == domain.AuthMethodPasswordMFA
}

func IsMFAAuth(method domain.AuthMethod) bool {
	return method == domain.AuthMethodPasswordMFA || method == domain.AuthMethodKeyMFA
}
