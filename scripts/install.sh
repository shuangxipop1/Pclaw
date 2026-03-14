#!/bin/bash
# =============================================================================
# Pclaw 一键安装脚本
# 
# 使用方法:
#   curl -fsSL https://pclaw.ai/install | sh
#   curl -fsSL https://pclaw.ai/install | sh -s -- --mode p2p
#   curl -fsSL https://pclaw.ai/install | sh -s -- --server https://pclaw.company.com
# =============================================================================

set -e

# 配置
VERSION="1.0.0"
INSTALL_DIR="/usr/local/pclaw"
CONFIG_DIR="$HOME/.pclaw"
API_URL="http://localhost:3000"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[Pclaw]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[Pclaw]${NC} $1"; }
log_error() { echo -e "${RED}[Pclaw]${NC} $1"; }
log_step() { echo -e "${BLUE}[→]${NC} $1"; }

# 帮助
show_help() {
    cat << EOF
Pclaw 一键安装脚本 v$VERSION

用法:
    $(basename $0) [选项]

选项:
    -h, --help              显示帮助
    -m, --mode MODE         安装模式: local/enterprise/p2p
    -s, --server URL        企业服务器地址
    -k, --api-key KEY       API密钥
    -n, --name NAME         Agent名称
    --register-skills       注册AI技能
    --register-products     注册产品能力
    --skip-install          跳过安装，仅注册能力

示例:
    $(basename $0)                          # 本地模式安装
    $(basename $0) --mode p2p              # P2P模式
    $(basename $0) --server https://pclaw.company.com  # 企业模式
    $(basename $0) --register-skills        # 注册技能

EOF
}

# 解析参数
MODE="local"
SERVER_URL=""
API_KEY=""
AGENT_NAME=""
REGISTER_SKILLS=false
REGISTER_PRODUCTS=false
SKIP_INSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -s|--server)
            SERVER_URL="$2"
            shift 2
            ;;
        -k|--api-key)
            API_KEY="$2"
            shift 2
            ;;
        -n|--name)
            AGENT_NAME="$2"
            shift 2
            ;;
        --register-skills)
            REGISTER_SKILLS=true
            shift
            ;;
        --register-products)
            REGISTER_PRODUCTS=true
            shift
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 检测系统
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
}

# 检查依赖
check_deps() {
    local missing=()
    
    if ! command -v curl &> /dev/null; then
        missing+=(curl)
    fi
    
    if ! command -v jq &> /dev/null; then
        missing+=(jq)
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_warn "缺少依赖: ${missing[*]}"
        log_info "安装依赖..."
        if [[ "$(detect_os)" == "macos" ]]; then
            brew install curl jq 2>/dev/null || true
        else
            apt-get update && apt-get install -y curl jq 2>/dev/null || true
        fi
    fi
}

# 检查Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_warn "Docker未安装"
        log_info "尝试安装Docker..."
        if [[ "$(detect_os)" == "macos" ]]; then
            log_info "请访问 https://docker.com 下载Docker Desktop"
            return 1
        else
            curl -fsSL https://get.docker.com | sh
        fi
    fi
    
    if ! docker info &> /dev/null; then
        log_warn "Docker未运行"
        log_info "请启动Docker后再试"
        return 1
    fi
    
    return 0
}

# 注册AI能力
register_abilities() {
    local agent_id=$1
    local name=$2
    local skills=$3
    local products=$4
    
    log_step "注册AI能力到Pclaw市场..."
    
    # 注册技能
    if [[ "$REGISTER_SKILLS" == "true" ]] && [[ -n "$skills" ]]; then
        log_info "注册技能: $skills"
        curl -s -X POST "$API_URL/api/ability/register" \
            -H "Content-Type: application/json" \
            -d "{
                \"agentId\": \"$agent_id\",
                \"name\": \"$name\",
                \"skills\": $skills,
                \"products\": []
            }" | jq -r '.success' || true
    fi
    
    # 注册产品
    if [[ "$REGISTER_PRODUCTS" == "true" ]] && [[ -n "$products" ]]; then
        log_info "注册产品: $products"
        curl -s -X POST "$API_URL/api/ability/register" \
            -H "Content-Type: application/json" \
            -d "{
                \"agentId\": \"$agent_id\",
                \"name\": \"$name\",
                \"skills\": [],
                \"products\": $products
            }" | jq -r '.success' || true
    fi
    
    # 同时注册技能和产品
    if [[ "$REGISTER_SKILLS" == "true" ]] && [[ "$REGISTER_PRODUCTS" == "true" ]]; then
        log_info "完整注册技能和产品..."
        curl -s -X POST "$API_URL/api/ability/register" \
            -H "Content-Type: application/json" \
            -d "{
                \"agentId\": \"$agent_id\",
                \"name\": \"$name\",
                \"skills\": $skills,
                \"products\": $products
            }" | jq -r '.success' || true
    fi
}

# 获取默认技能列表
get_default_skills() {
    cat << 'EOF'
[
    {"category": "DEVELOPMENT", "skill": "代码编写", "proficiency": 0.9},
    {"category": "DEVELOPMENT", "skill": "代码审查", "proficiency": 0.85},
    {"category": "DEVELOPMENT", "skill": "调试", "proficiency": 0.8},
    {"category": "DATA", "skill": "数据分析", "proficiency": 0.85},
    {"category": "CONTENT", "skill": "文案写作", "proficiency": 0.9},
    {"category": "RESEARCH", "skill": "信息检索", "proficiency": 0.95}
]
EOF
}

# 获取默认产品列表
get_default_products() {
    cat << 'EOF'
[
    {"category": "DEV_TOOLS", "product": "GitHub", "role": "user"},
    {"category": "AI_SERVICES", "product": "OpenAI", "role": "user"},
    {"category": "CLOUD", "product": "AWS", "role": "user"}
]
EOF
}

# 安装Pclaw
install_pclaw() {
    log_info "开始安装 Pclaw v$VERSION..."
    
    # 创建目录
    mkdir -p "$CONFIG_DIR"
    
    # 根据模式选择安装
    case $MODE in
        local)
            log_info "安装模式: 本地"
            # 检查Docker
            if ! check_docker; then
                log_warn "Docker未就绪，将以开发模式安装"
            fi
            ;;
            
        enterprise)
            if [[ -z "$SERVER_URL" ]]; then
                log_error "企业模式需要指定服务器地址 (--server)"
                exit 1
            fi
            log_info "安装模式: 企业 (连接到: $SERVER_URL)"
            API_URL="$SERVER_URL"
            ;;
            
        p2p)
            log_info "安装模式: P2P网络"
            ;;
            
        *)
            log_error "未知模式: $MODE"
            exit 1
            ;;
    esac
    
    # 保存配置
    cat > "$CONFIG_DIR/config.json" << EOF
{
    "version": "$VERSION",
    "mode": "$MODE",
    "server": "$SERVER_URL",
    "apiKey": "$API_KEY",
    "agentName": "$AGENT_NAME",
    "installedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    log_info "配置文件已保存到: $CONFIG_DIR/config.json"
}

# 启动服务
start_service() {
    if [[ "$MODE" == "local" ]]; then
        log_step "检查Pclaw服务..."
        
        if curl -s "$API_URL/" | grep -q "Pclaw"; then
            log_info "Pclaw服务已在运行"
        else
            log_warn "Pclaw服务未运行"
            log_info "请运行: cd pclaw && npm start"
        fi
    fi
}

# 打印完成信息
print_complete() {
    cat << EOF

╔══════════════════════════════════════════╗
║     🦞 Pclaw 安装完成!                ║
╚══════════════════════════════════════════╝

访问地址:
  • 管理界面: $API_URL/
  • API: $API_URL/api/

下一步:
  1. 注册AI技能: $0 --register-skills
  2. 注册产品: $0 --register-skills --register-products
  3. 查看技能市场: curl $API_URL/api/ability/market/skills
  4. 查看产品市场: curl $API_URL/api/ability/market/products

帮助: $0 --help

EOF
}

# 主流程
main() {
    log_info "Pclaw 一键安装 v$VERSION"
    log_info "安装模式: $MODE"
    
    # 检查依赖
    check_deps
    
    # 安装
    if [[ "$SKIP_INSTALL" != "true" ]]; then
        install_pclaw
    fi
    
    # 注册能力
    if [[ "$REGISTER_SKILLS" == "true" ]] || [[ "$REGISTER_PRODUCTS" == "true" ]]; then
        local agent_id="agent_$(date +%s)"
        local name="${AGENT_NAME:-Pclaw Agent}"
        
        local skills="[]"
        local products="[]"
        
        if [[ "$REGISTER_SKILLS" == "true" ]]; then
            skills=$(get_default_skills)
        fi
        
        if [[ "$REGISTER_PRODUCTS" == "true" ]]; then
            products=$(get_default_products)
        fi
        
        register_abilities "$agent_id" "$name" "$skills" "$products"
    fi
    
    # 启动
    start_service
    
    # 完成
    print_complete
}

main "$@"
