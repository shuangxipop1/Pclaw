@echo off
chcp 65001 >nul 2>&1
title U-Claw 虾盘 - 启动菜单
setlocal enabledelayedexpansion

set "UCLAW_DIR=%~dp0"
set "OPENCLAW_DIR=%UCLAW_DIR%openclaw"
set "NODE_DIR=%UCLAW_DIR%runtime\node-win-x64"
set "NODE_BIN=%NODE_DIR%\node.exe"
set "NPM_BIN=%NODE_DIR%\npm.cmd"
set "PATH=%NODE_DIR%;%PATH%"

:MENU
cls
echo.
echo   ╔════════════════════════════════════════════════════════╗
echo   ║                                                        ║
echo   ║          U-Claw 虾盘 v1.0                              ║
echo   ║          OpenClaw AI 助手 一键安装盘                     ║
echo   ║                                                        ║
echo   ║          专为中国用户优化 · 免翻墙 · 离线安装            ║
echo   ║                                                        ║
echo   ╠════════════════════════════════════════════════════════╣
echo   ║                                                        ║

:: 状态检测
for /f "tokens=*" %%v in ('"%NODE_BIN%" --version 2^>nul') do set "NODE_VER=%%v"
set "ST_MOD=未安装"
set "ST_BUILD=未构建"
set "ST_INST=未安装"
if exist "%OPENCLAW_DIR%\node_modules" set "ST_MOD=已安装"
if exist "%OPENCLAW_DIR%\dist" set "ST_BUILD=已构建"
if exist "%USERPROFILE%\.uclaw\openclaw" set "ST_INST=已安装"

echo   ║  系统: x64 ^| Node: %NODE_VER%                          ║
echo   ║  依赖: %ST_MOD% ^| 构建: %ST_BUILD% ^| 安装: %ST_INST%          ║
echo   ║                                                        ║
echo   ╠════════════════════════════════════════════════════════╣
echo.
echo     ---- 安装 -----------------------------------------
echo.
echo     [1]  一键安装 OpenClaw 到电脑（推荐）
echo     [2]  仅安装依赖（npm install）
echo     [3]  仅构建项目（npm build）
echo     [4]  直接从 U 盘运行（免安装）
echo.
echo     ---- 中国优化 -------------------------------------
echo.
echo     [5]  配置国产 AI 模型（DeepSeek/Kimi/通义千问）
echo     [6]  配置中国聊天平台（飞书/钉钉）
echo     [7]  设置国内镜像源
echo.
echo     ---- 维护工具 -------------------------------------
echo.
echo     [8]  诊断修复（openclaw doctor）
echo     [9]  备份当前状态
echo     [10] 恢复备份
echo     [11] 重置 OpenClaw（恢复出厂）
echo     [12] 清理缓存和临时文件
echo.
echo     ---- 其他 -----------------------------------------
echo.
echo     [13] 查看使用说明
echo     [14] 系统信息
echo     [0]  退出
echo.
echo   ╚════════════════════════════════════════════════════════╝
echo.

set /p CHOICE="  请选择 [0-14]: "

if "%CHOICE%"=="1" goto INSTALL
if "%CHOICE%"=="2" goto NPM_INSTALL
if "%CHOICE%"=="3" goto BUILD
if "%CHOICE%"=="4" goto RUN
if "%CHOICE%"=="5" goto CHINA_MODELS
if "%CHOICE%"=="6" goto CHINA_CHANNELS
if "%CHOICE%"=="7" goto MIRROR
if "%CHOICE%"=="8" goto DOCTOR
if "%CHOICE%"=="9" goto BACKUP
if "%CHOICE%"=="10" goto RESTORE
if "%CHOICE%"=="11" goto RESET
if "%CHOICE%"=="12" goto CLEANUP
if "%CHOICE%"=="13" goto README
if "%CHOICE%"=="14" goto SYSINFO
if "%CHOICE%"=="0" goto EXIT

echo   无效选择
pause
goto MENU

:INSTALL
echo.
echo   === 一键安装 OpenClaw 到电脑 ===
echo.
call "%UCLAW_DIR%安装到电脑.bat"
pause
goto MENU

:NPM_INSTALL
echo.
echo   === 安装 npm 依赖 ===
echo.
cd /d "%OPENCLAW_DIR%"
"%NODE_BIN%" "%NPM_BIN%" install --registry=https://registry.npmmirror.com
echo.
echo   依赖安装完成!
pause
goto MENU

:BUILD
echo.
echo   === 构建 OpenClaw ===
echo.
if not exist "%OPENCLAW_DIR%\node_modules" (
    echo   先安装依赖...
    cd /d "%OPENCLAW_DIR%"
    "%NODE_BIN%" "%NPM_BIN%" install --registry=https://registry.npmmirror.com
)
cd /d "%OPENCLAW_DIR%"
"%NODE_BIN%" "%NPM_BIN%" run build
echo.
echo   构建完成!
pause
goto MENU

:RUN
echo.
echo   === 从 U 盘启动 OpenClaw ===
echo.
if not exist "%OPENCLAW_DIR%\node_modules" (
    echo   先安装依赖...
    cd /d "%OPENCLAW_DIR%"
    "%NODE_BIN%" "%NPM_BIN%" install --registry=https://registry.npmmirror.com
)
if not exist "%OPENCLAW_DIR%\dist" (
    echo   先构建...
    cd /d "%OPENCLAW_DIR%"
    "%NODE_BIN%" "%NPM_BIN%" run build 2>nul
)
cd /d "%OPENCLAW_DIR%"
"%NODE_BIN%" openclaw.mjs onboard --install-daemon 2>nul || "%NODE_BIN%" openclaw.mjs 2>nul || "%NODE_BIN%" "%NPM_BIN%" start
pause
goto MENU

:CHINA_MODELS
echo.
echo   === 配置国产 AI 模型 ===
echo.
echo   [a] DeepSeek（深度求索）    - 性价比最高，推荐首选
echo   [b] Kimi / 月之暗面         - 256K 超长上下文
echo   [c] 通义千问 Qwen           - 阿里云，免费额度大
echo   [d] 智谱 GLM                - 清华系
echo   [e] MiniMax                  - 语音和多模态
echo   [f] 豆包 Doubao（字节跳动）  - 火山引擎平台
echo.
set /p MODEL="  请选择 (a-f): "

set "ENV_FILE=%OPENCLAW_DIR%\.env"
if not exist "%ENV_FILE%" type nul > "%ENV_FILE%"

if /i "%MODEL%"=="a" (
    echo.
    echo   配置 DeepSeek
    echo   获取 API Key: https://platform.deepseek.com/
    set /p APIKEY="  请输入 DeepSeek API Key: "
    echo OPENAI_API_KEY=!APIKEY!>> "%ENV_FILE%"
    echo OPENAI_BASE_URL=https://api.deepseek.com/v1>> "%ENV_FILE%"
    echo   DeepSeek 已配置!
)
if /i "%MODEL%"=="b" (
    echo.
    echo   配置 Kimi
    echo   获取 API Key: https://platform.moonshot.cn/
    set /p APIKEY="  请输入 Moonshot API Key: "
    echo OPENAI_API_KEY=!APIKEY!>> "%ENV_FILE%"
    echo OPENAI_BASE_URL=https://api.moonshot.cn/v1>> "%ENV_FILE%"
    echo   Kimi 已配置!
)
if /i "%MODEL%"=="c" (
    echo.
    echo   配置通义千问
    echo   获取 API Key: https://dashscope.console.aliyun.com/
    set /p APIKEY="  请输入 Qwen API Key: "
    echo ZAI_API_KEY=!APIKEY!>> "%ENV_FILE%"
    echo   通义千问已配置!
)
pause
goto MENU

:CHINA_CHANNELS
echo.
echo   === 配置中国聊天平台 ===
echo.
echo   [a] 飞书 Feishu/Lark  - 已内置，功能最全
echo   [b] Telegram           - 国内可用
echo.
echo   企业微信/钉钉/QQ 需要桥接服务，后续版本集成
echo.
set /p CH="  请选择 (a-b): "

if not exist "%OPENCLAW_DIR%\node_modules" (
    cd /d "%OPENCLAW_DIR%"
    "%NODE_BIN%" "%NPM_BIN%" install --registry=https://registry.npmmirror.com
)
cd /d "%OPENCLAW_DIR%"
"%NODE_BIN%" openclaw.mjs onboard
pause
goto MENU

:MIRROR
echo.
echo   === 设置国内镜像源 ===
echo.
cd /d "%OPENCLAW_DIR%"
"%NODE_BIN%" "%NPM_BIN%" config set registry https://registry.npmmirror.com --location=project
echo   npm 镜像已设置: registry.npmmirror.com
echo   后续 npm install 将自动使用淘宝镜像
pause
goto MENU

:DOCTOR
echo.
echo   === 诊断修复 ===
echo.
if not exist "%OPENCLAW_DIR%\node_modules" (
    cd /d "%OPENCLAW_DIR%"
    "%NODE_BIN%" "%NPM_BIN%" install --registry=https://registry.npmmirror.com
)
cd /d "%OPENCLAW_DIR%"
"%NODE_BIN%" openclaw.mjs doctor --repair
pause
goto MENU

:BACKUP
echo.
echo   === 备份当前状态 ===
echo.
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "BACKUP_DIR=%UCLAW_DIR%backups\backup_%TIMESTAMP%"
mkdir "%BACKUP_DIR%" 2>nul

if exist "%OPENCLAW_DIR%\.env" (
    copy "%OPENCLAW_DIR%\.env" "%BACKUP_DIR%\.env" >nul
    echo   [OK] .env 配置已备份
)
if exist "%USERPROFILE%\.openclaw\openclaw.json" (
    mkdir "%BACKUP_DIR%\openclaw-state" 2>nul
    copy "%USERPROFILE%\.openclaw\openclaw.json" "%BACKUP_DIR%\openclaw-state\" >nul
    echo   [OK] OpenClaw 状态已备份
)
if exist "%USERPROFILE%\.openclaw\credentials" (
    xcopy "%USERPROFILE%\.openclaw\credentials" "%BACKUP_DIR%\openclaw-state\credentials\" /e /i /q >nul 2>&1
    echo   [OK] 凭据已备份
)

echo.
echo   备份完成! 位置: %BACKUP_DIR%
pause
goto MENU

:RESTORE
echo.
echo   === 恢复备份 ===
echo.
set "BACKUP_BASE=%UCLAW_DIR%backups"
if not exist "%BACKUP_BASE%" (
    echo   没有找到任何备份
    pause
    goto MENU
)
echo   可用备份:
dir /b "%BACKUP_BASE%" 2>nul
echo.
set /p RESTORE_NAME="  输入备份名称: "
set "RESTORE_PATH=%BACKUP_BASE%\%RESTORE_NAME%"

if not exist "%RESTORE_PATH%" (
    echo   备份不存在
    pause
    goto MENU
)

if exist "%RESTORE_PATH%\.env" (
    copy "%RESTORE_PATH%\.env" "%OPENCLAW_DIR%\.env" >nul
    echo   [OK] .env 已恢复
)
if exist "%RESTORE_PATH%\openclaw-state" (
    xcopy "%RESTORE_PATH%\openclaw-state" "%USERPROFILE%\.openclaw\" /e /i /q /y >nul 2>&1
    echo   [OK] OpenClaw 状态已恢复
)

echo.
echo   恢复完成!
pause
goto MENU

:RESET
echo.
echo   === 重置 OpenClaw ===
echo.
echo   [1] 仅重置配置（保留凭据）
echo   [2] 重置配置+凭据+会话
echo   [3] 完全重置（恢复出厂）
echo   [0] 取消
echo.
set /p RESET_CHOICE="  选择重置级别: "

if "%RESET_CHOICE%"=="0" goto MENU
if not exist "%OPENCLAW_DIR%\node_modules" (
    cd /d "%OPENCLAW_DIR%"
    "%NODE_BIN%" "%NPM_BIN%" install --registry=https://registry.npmmirror.com
)
cd /d "%OPENCLAW_DIR%"

if "%RESET_CHOICE%"=="1" "%NODE_BIN%" openclaw.mjs reset --scope config
if "%RESET_CHOICE%"=="2" "%NODE_BIN%" openclaw.mjs reset --scope config+creds+sessions
if "%RESET_CHOICE%"=="3" (
    set /p CONFIRM="  确定完全重置? 输入 YES 确认: "
    if "!CONFIRM!"=="YES" "%NODE_BIN%" openclaw.mjs reset --scope full
)
pause
goto MENU

:CLEANUP
echo.
echo   === 清理缓存 ===
echo.
"%NODE_BIN%" "%NPM_BIN%" cache clean --force 2>nul
echo   npm 缓存已清理
if exist "%USERPROFILE%\.openclaw\logs" (
    rmdir /s /q "%USERPROFILE%\.openclaw\logs" 2>nul
    echo   日志已清理
)
echo.
echo   清理完成!
pause
goto MENU

:README
echo.
if exist "%UCLAW_DIR%使用说明.txt" (
    type "%UCLAW_DIR%使用说明.txt"
) else (
    echo   使用说明文件不存在
)
pause
goto MENU

:SYSINFO
echo.
echo   === 系统信息 ===
echo.
echo   操作系统:    %OS%
echo   处理器:      %PROCESSOR_ARCHITECTURE%
echo   Node.js:     %NODE_VER%
echo   U-Claw 路径: %UCLAW_DIR%
echo.
if exist "%USERPROFILE%\.uclaw" (
    echo   已安装路径: %USERPROFILE%\.uclaw
) else (
    echo   电脑安装:   未安装
)
if exist "%USERPROFILE%\.openclaw" (
    echo   OpenClaw 状态: %USERPROFILE%\.openclaw
)
echo.
pause
goto MENU

:EXIT
echo.
echo   再见!
echo.
exit /b 0
