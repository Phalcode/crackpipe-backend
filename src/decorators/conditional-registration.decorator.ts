import configuration from "../configuration";
import { Public } from "./public.decorator";

export const ConditionalRegistration = configuration.SERVER
  .REGISTRATION_DISABLED
  ? () => {}
  : Public();
