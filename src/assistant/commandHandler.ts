import CodemakerService from '../service/codemakerService';
import { CommandType, ICommand, AlertCommand, AssistantRequestCommand, CopyToClipboardCommand } from './command';

export default class CommandHandler {

    private commands: Map<string, ICommand>;

    constructor(private readonly _codemakerService: CodemakerService) {
        this.commands = new Map();
        this.commands.set(CommandType.alert.toString(), new AlertCommand());
        this.commands.set(CommandType.copyToClipboard.toString(), new CopyToClipboardCommand());
        this.commands.set(CommandType.assistantRequest.toString(), new AssistantRequestCommand(this._codemakerService));
    }

    async handleCommand(command: CommandType, message: any, webviewView: any) {
        const commandInstance = this.commands.get(command);
        if (!commandInstance) {
            console.warn('Unknown command: ' + command);
            return;
        }
        await commandInstance.execute(message, webviewView);
    }
}