import { deleteLineItem } from "@lib/data/cart"
import { Trash } from "@medusajs/icons"
import { Loader } from "@modules/common/components/loader"
import { clx } from "@medusajs/ui"
import { useRouter } from "next/navigation"
import { useState } from "react"

const DeleteButton = ({
  id,
  children,
  className,
}: {
  id: string
  children?: React.ReactNode
  className?: string
}) => {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (lineId: string) => {
    if (!lineId) return
    setError(null)
    setIsDeleting(true)
    try {
      await deleteLineItem(lineId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={clx(
        "flex flex-col gap-1 text-small-regular",
        className
      )}
    >
      <button
        type="button"
        className="flex gap-x-1 text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => handleDelete(id)}
        disabled={!id || isDeleting}
      >
        {isDeleting ? <Loader size={16} variant="secondary" /> : <Trash />}
        <span>{children}</span>
      </button>
      {error && (
        <span className="text-ui-fg-error text-small-regular">{error}</span>
      )}
    </div>
  )
}

export default DeleteButton
