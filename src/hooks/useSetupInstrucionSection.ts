import { useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { useTimeblockMutations, type AddTimeblockInput } from "./useTimeblockMutations"
import * as timeblocksIpc from "~/lib/ipc/timeblocks"

export interface AddSetupInstructionOptions {
  prefill?: "blank" | "default"
  title?: string
  details?: string
}

function mapSetupInstructionOptionsToCreateInput(options?: AddSetupInstructionOptions): AddTimeblockInput | undefined {
  if (!options) return undefined

  const input: AddTimeblockInput = {}

  if (options.title !== undefined) input.title = options.title
  if (options.details !== undefined) input.details = options.details
  if (options.prefill === "default") {
    input.prefill = {
      mode: "section_default",
      sectionType: "setup_instruction",
      overrides: {
        title: options.title,
        details: options.details,
      },
    }
  } else if (options.prefill === "blank") {
    input.prefill = { mode: "blank" }
  }

  return input
}

export function useSetupInstructionSection() {
  const { id: eventId } = useParams()

  const queryKey = ["setupInstructions", eventId] as const

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return await timeblocksIpc.getTimeblocksByEventAndSection(eventId!, "setup_instruction")
    },
    enabled: !!eventId,
  })

  const { addTimeblock, removeTimeblock, updateTimeblock } = useTimeblockMutations({
    queryKey,
    eventId: eventId!,
    sectionType: "setup_instruction",
  })

  const addSetupInstruction = (options?: AddSetupInstructionOptions) => {
    addTimeblock(mapSetupInstructionOptionsToCreateInput(options))
  }

  return {
    ...query,
    addSetupInstruction,
    removeTimeblock,
    updateTimeblock,
  }
}
