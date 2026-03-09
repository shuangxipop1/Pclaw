@echo off
chcp 65001 >nul 2>&1
title U-Claw - 安装 OpenClaw 到电脑

echo.
echo   ╔══════════════════════════════════════╗
echo   ║     U-Claw 安装到电脑               ║
echo   ║     OpenClaw 永久安装 (Windows)      ║
echo   ╚══════════════════════════════════════╝
echo.

set "UCLAW_DIR=%~dp0"
set "INSTALL_DIR=%USERPROFILE%\.uclaw"

echo   安装位置: %INSTALL_DIR%
echo   安装内容: Node.js + OpenClaw + 所有依赖
echo.
set /p CONFIRM="  是否继续安装? (y/n) "
if /i not "%CONFIRM%"=="y" (
    echo   已取消安装
    pause
    exit /b 0
)
echo.

echo   [1/4] 创建安装目录...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo   [2/4] 安装 Node.js 运行环境...
if exist "%INSTALL_DIR%\node" rmdir /s /q "%INSTALL_DIR%\node"
xcopy "%UCLAW_DIR%runtime\node-win-x64" "%INSTALL_DIR%\node\" /e /i /q >nul
for /f "tokens=*" %%v in ('"%INSTALL_DIR%\node\node.exe" --version') do echo   Node.js %%v 已安装

echo   [3/4] 安装 OpenClaw...
if exist "%INSTALL_DIR%\openclaw" (
    if exist "%INSTALL_DIR%\openclaw\.env" copy "%INSTALL_DIR%\openclaw\.env" "%TEMP%\.uclaw-env-backup" >nul 2>&1
    rmdir /s /q "%INSTALL_DIR%\openclaw"
)
xcopy "%UCLAW_DIR%openclaw" "%INSTALL_DIR%\openclaw\" /e /i /q >nul
if exist "%TEMP%\.uclaw-env-backup" (
    copy "%TEMP%\.uclaw-env-backup" "%INSTALL_DIR%\openclaw\.env" >nul 2>&1
    del "%TEMP%\.uclaw-env-backup" >nul 2>&1
)

if exist "%UCLAW_DIR%memory" xcopy "%UCLAW_DIR%memory" "%INSTALL_DIR%\memory\" /e /i /q >nul 2>&1
if exist "%UCLAW_DIR%persona" xcopy "%UCLAW_DIR%persona" "%INSTALL_DIR%\persona\" /e /i /q >nul 2>&1

echo   [4/4] 配置环境变量...

(
echo @echo off
echo set "UCLAW_HOME=%%USERPROFILE%%\.uclaw"
echo "%%UCLAW_HOME%%\node\node.exe" "%%UCLAW_HOME%%\openclaw\openclaw.mjs" %%*
) > "%INSTALL_DIR%\uclaw.cmd"

(
echo @echo off
echo set "UCLAW_HOME=%%USERPROFILE%%\.uclaw"
echo "%%UCLAW_HOME%%\node\node.exe" "%%UCLAW_HOME%%\openclaw\openclaw.mjs" %%*
) > "%INSTALL_DIR%\openclaw.cmd"

echo.
echo   正在添加到系统 PATH...
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "CURRENT_PATH=%%b"
echo %CURRENT_PATH% | findstr /i ".uclaw" >nul 2>&1
if errorlevel 1 (
    setx PATH "%INSTALL_DIR%;%INSTALL_DIR%\node;%CURRENT_PATH%" >nul 2>&1
    echo   已添加到用户 PATH
) else (
    echo   PATH 已配置，跳过
)

echo.
echo   ╔══════════════════════════════════════╗
echo   ║     安装完成!                        ║
echo   ╚══════════════════════════════════════╝
echo.
echo   安装位置: %INSTALL_DIR%
echo.
echo   使用方法:
echo     1. 打开新的命令提示符或 PowerShell
echo     2. 运行: openclaw
echo     或: uclaw
echo.
echo   首次使用请运行:
echo     openclaw onboard --install-daemon
echo.
pause
