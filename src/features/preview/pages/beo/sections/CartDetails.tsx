import type { CartDetails as CartDetailsData } from "~/definitions/database"
import { CartPreview } from "~/features/preview/components/CartPreview"

export const CartDetails = ({ details }: { details: CartDetailsData | undefined }) => {

  if (!details) return null

  return (
    <CartPreview
      time={details.time}
      assignedTo={details.assignedTo}
      whatGoesOnCarts={details.whatGoesOnCarts}
      customGrid={details.customGrid}
      showSetupMetadata
    />
  )
}
