import { useCartDetailsSection } from "~/hooks/useCartDetailsSection"
import { CartPreview } from "~/features/preview/components/CartPreview"

export const CartDetails = () => {
  const { data: details } = useCartDetailsSection()

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
