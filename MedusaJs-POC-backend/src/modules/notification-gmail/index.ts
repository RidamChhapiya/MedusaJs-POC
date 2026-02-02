import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import GmailNotificationProviderService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [GmailNotificationProviderService],
})
