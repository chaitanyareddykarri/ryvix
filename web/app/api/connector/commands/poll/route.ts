import {deviceCommandRequest} from '@/utils/device-commands';
export const POST=(request:Request)=>deviceCommandRequest(request,'/api/connector/commands/poll');
