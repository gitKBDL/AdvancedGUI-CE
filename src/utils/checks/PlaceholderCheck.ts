import { JsonObject } from "../manager/ComponentManager";
import { Check } from "./Check";

import PlaceholderCheckEditor from "@/components/actionEditors/checks/PlaceholderCheckEditor.vue";
import { markRaw } from "vue";

export enum ComparisonType {
  STRING = -1,
  LESS = 0,
  LESS_EQ = 1,
  EQUAL = 2,
  GREATER_EQ = 3,
  GREATER = 4,
}

export class PlaceholderCheck implements Check {
  public static id = "Placeholder Check";
  public static numberId = "Number Placeholder Check";
  public static component = markRaw(PlaceholderCheckEditor);

  public get name(): string {
    return this.compType === ComparisonType.STRING
      ? PlaceholderCheck.id
      : PlaceholderCheck.numberId;
  }

  constructor(
    public placeholder: string,
    public compType: ComparisonType,
    public value: string,
  ) {}

  static fromJson(jsonObj: JsonObject) {
    return new PlaceholderCheck(
      jsonObj.placeholder,
      jsonObj.comparisonType ?? jsonObj.compType ?? ComparisonType.STRING,
      jsonObj.value,
    );
  }

  toCheckDataObj(): JsonObject {
    if (this.compType !== ComparisonType.STRING) {
      const numericValue =
        typeof this.value === "number"
          ? this.value
          : Number.parseFloat(this.value);

      return {
        placeholder: this.placeholder,
        comparisonType: this.compType,
        value: Number.isFinite(numericValue) ? numericValue : 0,
      };
    }

    return {
      placeholder: this.placeholder,
      value: this.value,
    };
  }

  static generator() {
    return new PlaceholderCheck(
      "%armor_has_chestplate%",
      ComparisonType.STRING,
      "true",
    );
  }

  static numberGenerator() {
    return new PlaceholderCheck("%player_health%", ComparisonType.EQUAL, "20");
  }
}
