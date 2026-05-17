const transparency = "bg-[color:color-mix(in_srgb,#bbbbbc_12%,transparent)] backdrop-blur-[8px] backdrop-saturate-[150%] [-webkit-backdrop-filter:blur(8px)saturate(150%)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,#fff_10%,transparent),inset_2px_1px-1px_color-mix(in_srgb,#fff_90%,transparent),inset_-1.5px_-1px_-1px_color-mix(in_srgb,#fff_80%,transparent),inset_-0.3px_-1px_4px_0px_color-mix(in_srgb,#000_12%,transparent),inset_2px_-2px_6px_0px_color-mix(in_srgb,#000_6%,transparent),0px_6px_16px_0px_color-mix(in_srgb,#000_8%,transparent)]"
const border = "shadow-[inset_0_0_0_1px_color-mix(in_srgb,#e5e5e5_10%,transparent),inset_1.8px_3px_0px_-2px_color-mix(in_srgb,#c8e7de_90%,transparent),inset_-2px_-2px_0px_-2px_color-mix(in_srgb,#c8e7de_80%,transparent),inset_-3px_-8px_1px_-6px_color-mix(in_srgb,#e5e5e5_60%,transparent),inset_-0.3px_-1px_4px_0px_color-mix(in_srgb,#000_12%,transparent),inset_-1.5px_2.5px_0px_-2px_color-mix(in_srgb,#000_20%,transparent),inset_0px_3px_4px_-2px_color-mix(in_srgb,#000_20%,transparent),inset_2px_-6.5px_1px_-4px_color-mix(in_srgb,#000_10%,transparent)] rounded-xl"

export const glassUI = `${transparency} ${border}`

export const glassUIBubbleHover = "hover:cursor-pointer transform-gpu will-change-transform transition-transform duration-[200ms] ease-[cubic-bezier(0.5,0,0,1)] hover:scale-115"

export default function getGlassUI(color: "black" | "white" | "red" | "blue" | "green" | "dark-black" | undefined): string {

    let frostedBackground = "";
    const shadowBorders = " shadow-[inset_0_0_0_1px_color-mix(in_srgb,#e5e5e5_10%,transparent),inset_1.8px_3px_0px_-2px_color-mix(in_srgb,#e5e5e5_90%,transparent),inset_-2px_-2px_0px_-2px_color-mix(in_srgb,#e5e5e5_80%,transparent),inset_-3px_-8px_1px_-6px_color-mix(in_srgb,#e5e5e5_60%,transparent),inset_-0.3px_-1px_4px_0px_color-mix(in_srgb,#26715a_12%,transparent),inset_-1.5px_2.5px_0px_-2px_color-mix(in_srgb,#26715a_20%,transparent),inset_0px_3px_4px_-2px_color-mix(in_srgb,#26715a_20%,transparent),inset_2px_-6.5px_1px_-4px_color-mix(in_srgb,#26715a_10%,transparent)] rounded-xl";

    
    switch (color) {
        case "white":
            frostedBackground = `bg-[color:color-mix(in_srgb,#fff_15%,transparent)]
                backdrop-blur-[8px]
                backdrop-saturate-[150%]
                [-webkit-backdrop-filter:blur(8px)saturate(150%)]
                shadow-[inset_0_0_0_1px_color-mix(in_srgb,#000_10%,transparent),inset_2px_1px-1px_color-mix(in_srgb,#000_90%,transparent),inset_-1.5px_-1px_-1px_color-mix(in_srgb,#000_80%,transparent),inset_-0.3px_-1px_4px_0px_color-mix(in_srgb,#FFF_12%,transparent),inset_2px_-2px_6px_0px_color-mix(in_srgb,#FFF_6%,transparent),0px_6px_16px_0px_color-mix(in_srgb,#FFF_8%,transparent)]`;
            break;

        case "black":
            frostedBackground = `bg-[color:color-mix(in_srgb,#000_15%,transparent)]
                backdrop-blur-[8px]
                backdrop-saturate-[150%]
                [-webkit-backdrop-filter:blur(8px)saturate(150%)]
                shadow-[inset_0_0_0_1px_color-mix(in_srgb,#FFF_10%,transparent),inset_2px_1px-1px_color-mix(in_srgb,#FFF_90%,transparent),inset_-1.5px_-1px_-1px_color-mix(in_srgb,#FFF_80%,transparent),inset_-0.3px_-1px_4px_0px_color-mix(in_srgb,#000_12%,transparent),inset_2px_-2px_6px_0px_color-mix(in_srgb,#000_6%,transparent),0px_6px_16px_0px_color-mix(in_srgb,#000_8%,transparent)]`;
            break;

        case "dark-black":
            frostedBackground = `bg-[color:color-mix(in_srgb,#000_50%,transparent)]
                backdrop-blur-[8px]
                backdrop-saturate-[150%]
                [-webkit-backdrop-filter:blur(8px)saturate(150%)]
                shadow-[inset_0_0_0_1px_color-mix(in_srgb,#4a4a4a_10%,transparent),inset_2px_1px-1px_color-mix(in_srgb,#4a4a4a_90%,transparent),inset_-1.5px_-1px_-1px_color-mix(in_srgb,#4a4a4a_80%,transparent),inset_-0.3px_-1px_4px_0px_color-mix(in_srgb,#000_12%,transparent),inset_2px_-2px_6px_0px_color-mix(in_srgb,#000_6%,transparent),0px_6px_16px_0px_color-mix(in_srgb,#000_8%,transparent)]`;
            break;
        
        case "blue":
            frostedBackground = `bg-[color:color-mix(in_srgb,#165dfc_15%,transparent)]
                backdrop-blur-[8px]
                backdrop-saturate-[150%]
                [-webkit-backdrop-filter:blur(8px)saturate(150%)]
                shadow-[inset_0_0_0_1px_color-mix(in_srgb,#FFF_10%,transparent),inset_2px_1px-1px_color-mix(in_srgb,#FFF_90%,transparent),inset_-1.5px_-1px_-1px_color-mix(in_srgb,#FFF_80%,transparent),inset_-0.3px_-1px_4px_0px_color-mix(in_srgb,#165dfc_12%,transparent),inset_2px_-2px_6px_0px_color-mix(in_srgb,#165dfc_6%,transparent),0px_6px_16px_0px_color-mix(in_srgb,#165dfc_8%,transparent)]`;
            break;

        case "red":
            frostedBackground = `bg-[color:color-mix(in_srgb,#FB2B37_15%,transparent)]
                backdrop-blur-[8px]
                backdrop-saturate-[150%]
                [-webkit-backdrop-filter:blur(8px)saturate(150%)]
                shadow-[inset_0_0_0_1px_color-mix(in_srgb,#FFF_10%,transparent),inset_2px_1px-1px_color-mix(in_srgb,#FFF_90%,transparent),inset_-1.5px_-1px_-1px_color-mix(in_srgb,#FFF_80%,transparent),inset_-0.3px_-1px_4px_0px_color-mix(in_srgb,#FB2B37_12%,transparent),inset_2px_-2px_6px_0px_color-mix(in_srgb,#FB2B37_6%,transparent),0px_6px_16px_0px_color-mix(in_srgb,#FB2B37_8%,transparent)]`;
            break;

        case "green":
            frostedBackground = `bg-[color:color-mix(in_srgb,#00C951_15%,transparent)]
                backdrop-blur-[8px]
                backdrop-saturate-[150%]
                [-webkit-backdrop-filter:blur(8px)saturate(150%)]
                shadow-[inset_0_0_0_1px_color-mix(in_srgb,#FFF_10%,transparent),inset_2px_1px-1px_color-mix(in_srgb,#FFF_90%,transparent),inset_-1.5px_-1px_-1px_color-mix(in_srgb,#FFF_80%,transparent),inset_-0.3px_-1px_4px_0px_color-mix(in_srgb,#00C951_12%,transparent),inset_2px_-2px_6px_0px_color-mix(in_srgb,#00C951_6%,transparent),0px_6px_16px_0px_color-mix(in_srgb,#00C951_8%,transparent)]`;
            break;

    }

    return frostedBackground + shadowBorders;
}