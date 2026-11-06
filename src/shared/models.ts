// Shapes mirror FinMate.Application DTOs. Verify against sanitized live fixtures when an Admin dev account is available.
export type UserRole = 'User'|'Staff'|'OpsManager'|'Admin';
export const ROLES: UserRole[] = ['User','Staff','OpsManager','Admin'];
export type AdminUser = {id:string;email:string;displayName:string;role:UserRole;isLocked:boolean;hasPassword:boolean;hasGoogleLink:boolean;createdAt:string;deletedAt:string|null};
export type AuditLog = {id:string;userId:string|null;eventType:string;metadata:string|null;ipAddress:string|null;createdAt:string};
export type DeletionRequest = {id:string;userId:string;email:string;displayName:string;status:'Pending'|'Processed'|'Cancelled';requestedAt:string;scheduledHardDeleteAt:string;processedAt:string|null;daysUntilHardDelete:number};
export type AdminCategory = {id:string;name:string;slug:string;iconName:string|null;isActive:boolean;createdAt:string;updatedAt:string};
export type ProviderConfig = {id:string;providerKey:string;displayName:string;packageName:string;accountType:'Bank'|'EWallet'|'Cash';isActive:boolean;createdAt:string;updatedAt:string};
export type GoalTemplate = {id:string;code:string;name:string;description:string;defaultParams:unknown;isActive:boolean;createdAt:string;updatedAt:string};
export type FinanceMethod = {id:string;code:string;name:string;summary:string;role:'Primary'|'Supporting'|'Both';goalMode:'ReserveFirst'|'Envelope'|'AvailableToSpend'|'TrackOnly';paramDefs:unknown;eligibility:unknown;whyText:string;starterSteps:unknown;homeLayout:unknown;sortOrder:number;isActive:boolean;version:number;createdAt:string;updatedAt:string;activeUserCount:number};
export type ParamDef = {key:string;label:string;type:'percent'|'int'|'cents'|'minutes';default:number;min:number;max:number;userEditable:boolean};
/** Một khối trang chủ của một cách quản lý. `keys` và `display` chỉ dùng cho khối `params`. */
export type JarDef = {key:string;label?:string;categories:string[]};
export type HomeBlock = {type:string;title?:string;keys?:string[];display?:'list'|'allocation';jars?:JarDef[]};
/** Loại khối app biết vẽ, lấy từ `GET /admin/finance-methods/home-blocks` (admin không giữ bản sao danh sách). */
export type HomeBlockType = {type:string;name:string;description:string;acceptsKeys:boolean;acceptsDisplay:boolean;repeatable:boolean;acceptsJars?:boolean};
/** Phiên bản chỉ dẫn AI. AI service trả snake_case và backend chuyển tiếp nguyên văn. */
export type PromptVersion = {prompt_version:string;instruction_text:string;is_active:boolean;created_at:string;updated_at:string};
export type PromptList = {active_version:string|null;items:PromptVersion[];total:number;limit:number;offset:number};
export type SurveyOption = {id:string;code:string;text:string;signals:unknown;sortOrder:number;isActive:boolean};
export type SurveyQuestion = {id:string;code:string;groupCode:string;text:string;showIf:unknown;sortOrder:number;isActive:boolean;options:SurveyOption[]};
export type AiStats = {production:{from:string;to:string;totalAnalyzed:number;byPipelineResult:Record<string,number>;byPackageName:Record<string,number>;byClassifierVersion:Record<string,number>;potentialDuplicates:number;draftsCreated:number;draftsConfirmed:number;draftConfirmRate:number|null;categoryCorrections:number;categoryCorrectionRate:number|null;avgClassifierConfidence:number|null;avgExtractionConfidence:number|null;avgCategorizationConfidence:number|null;avgProcessingMs:number|null;maxProcessingMs:number|null};aiService:{models:{stage:string;version:string|null;accuracy:number|null}[];rawSampleCount:number;labeledSampleCount:number;unlabeledSampleCount:number;pendingFeedbackCount:number}|null;aiServiceError:string|null};
