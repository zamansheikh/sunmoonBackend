export default class PrivilegeService {
  private static instance: PrivilegeService;

  private constructor() {}

  public static getInstance(): PrivilegeService {
    if (!PrivilegeService.instance) {
      PrivilegeService.instance = new PrivilegeService();
    }
    return PrivilegeService.instance;
  }

  
}

const availablePrivileges = [
  {
    name: "Anti-ban Chat",
    description: "No one can ban from sending messages in the room",
    tag: "anti_ban_chat",
  },
  {
    name: "Anti-kick",
    description: "No one can kick you from the room",
    tag: "anti_kick",
  },
  {
    name: "Anti-mute",
    description: "No one can mute you in the room",
    tag: "anti_mute",
  },
];
