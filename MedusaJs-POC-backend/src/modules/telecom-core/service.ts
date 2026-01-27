import { MedusaService } from "@medusajs/framework/utils"
import PlanConfiguration from "./models/plan-configuration"
import MsisdnInventory from "./models/msisdn-inventory"
import Subscription from "./models/subscription"
import UsageCounter from "./models/usage-counter"
import Invoice from "./models/invoice"
import PaymentAttempt from "./models/payment-attempt"
import DeviceContract from "./models/device-contract"
import PortingRequest from "./models/porting-request"
import FamilyPlan from "./models/family-plan"
import FamilyMember from "./models/family-member"
import CorporateAccount from "./models/corporate-account"
import CorporateSubscription from "./models/corporate-subscription"
import RoamingPackage from "./models/roaming-package"
import DeviceInsurance from "./models/device-insurance"
import CustomerProfile from "./models/customer-profile"

/**
 * Telecom Core Module Service
 * Automatically provides CRUD methods for all registered models
 */
class TelecomCoreModuleService extends MedusaService({
    PlanConfiguration,
    MsisdnInventory,
    Subscription,
    UsageCounter,
    Invoice,
    PaymentAttempt,
    DeviceContract,
    PortingRequest,
    FamilyPlan,
    FamilyMember,
    CorporateAccount,
    CorporateSubscription,
    RoamingPackage,
    DeviceInsurance,
    CustomerProfile,
}) { }

export default TelecomCoreModuleService
