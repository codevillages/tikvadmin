package config

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

// Config represents the application configuration
type Config struct {
	TiKV TiKVConfig `json:"tikv"`
}

// TiKVConfig contains TiKV cluster configuration
type TiKVConfig struct {
	PDEndpoints []string `json:"pd_endpoints"`
}

// LoadConfig loads configuration from file and environment variables
func LoadConfig(configPath string) (*Config, error) {
	// Default configuration
	config := &Config{
		TiKV: TiKVConfig{
			PDEndpoints: []string{
				"127.0.0.1:2379", // default PD endpoint
			},
		},
	}

	// Try to load from file if specified and exists
	if configPath != "" {
		if _, err := os.Stat(configPath); err == nil {
			if err := loadFromFile(config, configPath); err != nil {
				return nil, fmt.Errorf("failed to load config from file: %v", err)
			}
		} else if !os.IsNotExist(err) {
			// File exists but there was an error accessing it
			return nil, fmt.Errorf("failed to access config file: %v", err)
		}
		// If file doesn't exist, continue with defaults
	}

	// Override with environment variables if set
	loadFromEnv(config)

	return config, nil
}

// loadFromFile loads configuration from a JSON file
func loadFromFile(config *Config, filePath string) error {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read config file: %v", err)
	}

	if err := json.Unmarshal(data, config); err != nil {
		return fmt.Errorf("failed to parse config file: %v", err)
	}

	return nil
}

// loadFromEnv loads configuration from environment variables
func loadFromEnv(config *Config) {
	// Load PD endpoints from environment variable
	if pdEndpoints := os.Getenv("TIKV_PD_ENDPOINTS"); pdEndpoints != "" {
		// Split by comma and trim spaces
		endpoints := strings.Split(pdEndpoints, ",")
		for i, endpoint := range endpoints {
			endpoints[i] = strings.TrimSpace(endpoint)
		}
		config.TiKV.PDEndpoints = endpoints
	}
}

// GetPDEndpoints returns the PD endpoints as a slice of strings
func (c *Config) GetPDEndpoints() []string {
	return c.TiKV.PDEndpoints
}