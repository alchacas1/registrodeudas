import { joinGroupWithFirebase } from "./_firebase-join-dependencies";
import { createJoinGroupHandler } from "./_join-handler";

export default {
  fetch: createJoinGroupHandler(joinGroupWithFirebase),
};
