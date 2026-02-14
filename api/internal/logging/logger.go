package logging

import (
	"io"
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"gopkg.in/natefinch/lumberjack.v2"
)

// InitLogger initializes the global logger with production-ready configuration
func InitLogger(appEnv string) {
	var writers []io.Writer

	// Console output (always enabled in development)
	if appEnv == "local" || appEnv == "development" {
		// Pretty console output for development
		consoleWriter := zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}
		writers = append(writers, consoleWriter)
	} else {
		// JSON to stdout in production (for container log aggregation)
		writers = append(writers, os.Stdout)
	}

	// File logging (always enabled)
	// Create logs directory if it doesn't exist
	os.MkdirAll("logs", 0755)

	// Rotating file writer
	fileWriter := &lumberjack.Logger{
		Filename:   "logs/app.log",
		MaxSize:    100, // megabytes
		MaxBackups: 3,   // Keep last 3 rotated files
		MaxAge:     28,  // days
		Compress:   true,
	}
	writers = append(writers, fileWriter)

	// Error-only log file (easier to find critical issues)
	errorWriter := &lumberjack.Logger{
		Filename:   "logs/error.log",
		MaxSize:    100,
		MaxBackups: 3,
		MaxAge:     28,
		Compress:   true,
	}

	// Multi-level writer: normal logs to all writers, errors also to error.log
	multi := zerolog.MultiLevelWriter(writers...)

	// Set global logger
	logger := zerolog.New(multi).With().Timestamp().Caller().Logger()

	// Hook to also write errors to error.log
	logger = logger.Hook(zerolog.HookFunc(func(e *zerolog.Event, level zerolog.Level, message string) {
		if level >= zerolog.ErrorLevel {
			// Write to error-only log file
			errorWriter.Write([]byte(message + "\n"))
		}
	}))

	// Set log level based on environment
	switch appEnv {
	case "local", "development":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "staging":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "production":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	// Set as global logger
	log.Logger = logger

	log.Info().
		Str("environment", appEnv).
		Str("log_level", zerolog.GlobalLevel().String()).
		Msg("Logger initialized")
}

// GetLogger returns the global logger (convenience function)
func GetLogger() *zerolog.Logger {
	return &log.Logger
}

// Future: Add remote logging service integration
// Uncomment and configure when ready to use Betterstack, Sentry, etc.

/*
// Example: Betterstack/Logtail integration
import "github.com/logtail/logtail-go"

func InitBetterstackLogger(sourceToken string) io.Writer {
	if sourceToken == "" {
		return nil
	}

	logtail := logtail.New(sourceToken)
	return logtail
}

// Add to writers:
// if betterstack := InitBetterstackLogger(os.Getenv("BETTERSTACK_SOURCE_TOKEN")); betterstack != nil {
//     writers = append(writers, betterstack)
// }
*/

/*
// Example: Sentry integration for error tracking
import "github.com/getsentry/sentry-go"

func InitSentry(dsn string) {
	err := sentry.Init(sentry.ClientOptions{
		Dsn: dsn,
		Environment: appEnv,
	})
	if err != nil {
		log.Error().Err(err).Msg("Failed to initialize Sentry")
	}
}
*/
