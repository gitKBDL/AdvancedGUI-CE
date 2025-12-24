import { Action } from "./Action";
import { JsonObject } from "../manager/ComponentManager";

export class ListNextAction extends Action {
  public static id = "View Next";
  public static legacyId = "List next";
  public id = ListNextAction.id;

  constructor(
    public targetId: string,
    public forward: boolean,
  ) {
    super();
  }

  static fromJson(jsonObj: JsonObject) {
    return new ListNextAction(jsonObj.targetId, jsonObj.forward);
  }

  toDataObj() {
    return {
      targetId: this.targetId,
      forward: this.forward,
    };
  }
}
