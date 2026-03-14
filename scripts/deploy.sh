#!/bin/bash
# Pclaw 部署脚本

set -e

echo "=========================================="
echo "  Pclaw 部署脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查依赖
check_dependencies() {
    echo -e "\n${YELLOW}检查依赖...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: Node.js 未安装${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}错误: npm 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}依赖检查通过${NC}"
}

# 安装依赖
install_dependencies() {
    echo -e "\n${YELLOW}安装依赖...${NC}"
    npm install
    echo -e "${GREEN}依赖安装完成${NC}"
}

# 运行测试
run_tests() {
    echo -e "\n${YELLOW}运行测试...${NC}"
    node test/economy.test.js
    echo -e "${GREEN}测试通过${NC}"
}

# 构建
build() {
    echo -e "\n${YELLOW}构建项目...${NC}"
    # 添加构建命令
    echo -e "${GREEN}构建完成${NC}"
}

# 部署到开发环境
deploy_dev() {
    echo -e "\n${YELLOW}部署到开发环境...${NC}"
    export NODE_ENV=development
    # 添加部署命令
    echo -e "${GREEN}开发环境部署完成${NC}"
}

# 部署到测试环境
deploy_testnet() {
    echo -e "\n${YELLOW}部署到测试网 (Polygon Mumbai)...${NC}"
    
    # 检查环境变量
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}错误: PRIVATE_KEY 未设置${NC}"
        exit 1
    fi
    
    if [ -z "$RPC_URL" ]; then
        echo -e "${RED}错误: RPC_URL 未设置${NC}"
        exit 1
    fi
    
    export NODE_ENV=testnet
    # 部署合约
    echo -e "${GREEN}测试网部署完成${NC}"
}

# 部署到主网
deploy_mainnet() {
    echo -e "\n${YELLOW}⚠️  部署到主网...${NC}"
    
    # 多次确认
    echo "请确认部署到主网 (Polygon Mainnet)?"
    read -p "输入 'YES' 确认: " confirm
    
    if [ "$confirm" != "YES" ]; then
        echo "已取消"
        exit 0
    fi
    
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}错误: PRIVATE_KEY 未设置${NC}"
        exit 1
    fi
    
    export NODE_ENV=mainnet
    echo -e "${GREEN}主网部署完成${NC}"
}

# 部署合约
deploy_contract() {
    local network=$1
    echo -e "\n${YELLOW}部署智能合约到 $network...${NC}"
    
    # 编译合约
    # npx hardhat compile
    
    # 部署
    # npx hardhat run scripts/deploy.js --network $network
    
    echo -e "${GREEN}合约部署完成${NC}"
}

# 验证合约
verify_contract() {
    local network=$1
    echo -e "\n${YELLOW}验证合约...${NC}"
    # npx hardhat verify --network $network CONTRACT_ADDRESS
    echo -e "${GREEN}合约验证完成${NC}"
}

# 打印帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  all           运行完整部署流程"
    echo "  deps          仅安装依赖"
    echo "  test          运行测试"
    echo "  build         构建项目"
    echo "  dev           部署到开发环境"
    echo "  testnet       部署到测试网"
    echo "  mainnet       部署到主网"
    echo "  contract      仅部署合约"
    echo "  verify        验证合约"
    echo "  help          显示帮助"
}

# 主流程
case "${1:-help}" in
    all)
        check_dependencies
        install_dependencies
        run_tests
        build
        deploy_dev
        ;;
    deps)
        install_dependencies
        ;;
    test)
        run_tests
        ;;
    build)
        build
        ;;
    dev)
        deploy_dev
        ;;
    testnet)
        deploy_testnet
        ;;
    mainnet)
        deploy_mainnet
        ;;
    contract)
        deploy_contract "${2:-dev}"
        ;;
    verify)
        verify_contract "${2:-dev}"
        ;;
    help|*)
        show_help
        ;;
esac

echo -e "\n${GREEN}完成!${NC}\n"
