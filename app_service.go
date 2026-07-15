package main

import (
	"context"
)

type AppService struct{}

func (a *AppService) GetVersion() string {
	return currentVersion
}

func (a *AppService) CheckForUpdates() error {
	return appInst.Updater.CheckAndInstall(context.Background())
}
