import { foodItems, beverageItems, tournamentDetails, menuOfChargeItems } from "~/electron/db/schema";

export const ITER_FOOD_SERVICE_STYLE = foodItems.serviceStyle.enumValues

export const ITER_BEVERAGE_SERVICE_STYLE = beverageItems.serviceStyle.enumValues

export const ITER_GOLF_START_FORMAT = tournamentDetails.startFormat.enumValues
export const ITER_GOLF_PLAY_FORMAT = tournamentDetails.playFormat.enumValues

export const ITER_MENU_OF_CHARGE_CATEGORY = menuOfChargeItems.category.enumValues
