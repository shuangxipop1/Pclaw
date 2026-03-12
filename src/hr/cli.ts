/**
 * Pclaw HR CLI 命令
 */

import { HRAuthorizationService } from './authorization';
import { HROrgChartService } from './orgChart';
import { HRPermissionChecker } from './permission';

const authService = new HRAuthorizationService();
const orgChartService = new HROrgChartService(authService);

function printOrgTree(nodes: any[], indent: string = '', isLast: boolean = true): void {
  const roleEmoji = (role: string) => {
    const map: Record<string, string> = {
      project_manager: '👑',
      design_manager: '📋',
      procurement_manager: '📦',
      construction_manager: '👷',
      engineer: '🔧',
      designer: '🎨'
    };
    return map[role] || '👤';
  };

  nodes.forEach((node, index) => {
    const isLastNode = index === nodes.length - 1;
    const connector = indent + (isLastNode ? '└── ' : '├── ');
    const statusEmoji = node.status === 'online' ? '🟢' : '⚪️';
    
    console.log(`${connector}${roleEmoji(node.role)} ${node.displayName} ${statusEmoji}`);

    if (node.children && node.children.length > 0) {
      const childIndent = indent + (isLastNode ? '    ' : '│   ');
      printOrgTree(node.children, childIndent, isLastNode);
    }
  });
}

function printTable(nodes: any[]): void {
  console.log('\n| 姓名   | 角色          | 部门     | 状态 |');
  console.log('|--------|---------------|----------|------|');
  
  const printRows = (nodes: any[], prefix = '') => {
    nodes.forEach(node => {
      const roleStr = node.role.replace('_manager', '').substring(0, 11);
      console.log(
        `| ${(prefix + node.displayName).padEnd(6)} | ${roleStr.padEnd(13)} | ${node.department.substring(0, 8).padEnd(8)} | ${node.status === 'online' ? '在线 ' : '离线 '} |`
      );
      if (node.children) {
        printRows(node.children, prefix + '  ');
      }
    });
  };
  
  printRows(nodes);
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'org-chart';

  try {
    switch (command) {
      case 'org-chart': {
        const userId = process.env.USER || 'cli_user';
        
        const options: any = {};
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--department' && args[i + 1]) {
            options.department = args[i + 1];
            i++;
          } else if (args[i] === '--depth' && args[i + 1]) {
            options.depth = parseInt(args[i + 1]);
            i++;
          } else if (args[i] === '--format' && args[i + 1]) {
            options.format = args[i + 1];
            i++;
          }
        }

        const view = await orgChartService.getOrgChart(userId, options);
        
        console.log(`\n🏢 组织架构图 (最后更新: ${new Date(view.lastSyncAt).toLocaleString()})`);
        console.log(`📊 总人数: ${view.totalNodes}`);
        console.log(`🏭 部门: ${view.departments.join(', ')}\n`);

        if (options.format === 'table') {
          printTable(view.rootNodes);
        } else {
          printOrgTree(view.rootNodes);
        }
        break;
      }

      case 'authorize': {
        const subCommand = args[1];
        
        if (subCommand === 'list') {
          const users = authService.getAuthorizations();
          console.log('\n📋 已授权用户列表:\n');
          if (users.length === 0) {
            console.log('  (无)');
          } else {
            console.log('| 用户ID   | 显示名称 | 角色        | 部门       | 授权时间 |');
            console.log('|----------|----------|-------------|------------|----------|');
            
            users.forEach(u => {
              console.log(
                `| ${u.userId.padEnd(8)} | ${u.displayName.padEnd(6)} | ${u.allowedRoles.join(', ').padEnd(11)} | ${u.allowedDepartments.join(', ').substring(0, 10).padEnd(10)} | ${new Date(u.grantedAt).toLocaleDateString()} |`
              );
            });
          }
          console.log('');
        } else if (subCommand === 'revoke') {
          const targetUserId = args[2];
          if (!targetUserId) {
            console.error('用法: pclaw hr authorize revoke <userId>');
            process.exit(1);
          }
          await authService.revokeAuthorization(targetUserId, process.env.USER || 'admin');
        } else if (subCommand) {
          const targetUserId = subCommand;
          let displayName = targetUserId;
          let roles: string[] = [];
          let departments: string[] = [];

          for (let i = 2; i < args.length; i++) {
            if (args[i] === '--name' && args[i + 1]) {
              displayName = args[i + 1];
              i++;
            } else if (args[i] === '--roles' && args[i + 1]) {
              roles = args[i + 1].split(',');
              i++;
            } else if (args[i] === '--depts' && args[i + 1]) {
              departments = args[i + 1].split(',');
              i++;
            }
          }

          if (roles.length === 0) roles = ['member'];
          if (departments.length === 0) departments = ['*'];

          await authService.authorizeUser(
            targetUserId,
            displayName,
            roles as any,
            departments,
            process.env.USER || 'admin'
          );
        } else {
          console.log('用法:');
          console.log('  pclaw hr authorize <userId> --roles <r1,r2> --depts <d1,d2>');
          console.log('  pclaw hr authorize list');
          console.log('  pclaw hr authorize revoke <userId>');
        }
        break;
      }

      case 'department': {
        const subCommand = args[1];
        
        if (subCommand === 'list') {
          const depts = await orgChartService.getDepartments();
          console.log('\n🏭 部门列表:\n');
          if (depts.length === 0) {
            console.log('  (无)');
          } else {
            depts.forEach(d => {
              console.log(`  • ${d.name}`);
            });
          }
          console.log('');
        } else if (subCommand === 'members' && args[2]) {
          const members = await orgChartService.getDepartmentMembers(args[2]);
          console.log(`\n👥 ${args[2]} 成员:\n`);
          if (members.length === 0) {
            console.log('  (无)');
          } else {
            members.forEach(m => {
              console.log(`  ${m.status === 'online' ? '🟢' : '⚪️'} ${m.displayName} (${m.role})`);
            });
          }
          console.log('');
        }
        break;
      }

      default:
        console.log('HR 组织架构命令:');
        console.log('  pclaw hr org-chart                    # 查看组织架构');
        console.log('  pclaw hr org-chart --department 设计部 # 查看指定部门');
        console.log('  pclaw hr org-chart --depth 2           # 查看深度');
        console.log('  pclaw hr org-chart --format table      # 表格输出');
        console.log('  pclaw hr authorize <userId> ...        # 授权用户');
        console.log('  pclaw hr authorize list                # 授权列表');
        console.log('  pclaw hr authorize revoke <userId>     # 撤销授权');
        console.log('  pclaw hr department list               # 部门列表');
        console.log('  pclaw hr department members <dept>    # 部门成员');
    }
  } catch (error: any) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

export { HRAuthorizationService, HROrgChartService, HRPermissionChecker };

if (require.main === module) {
  main();
}
