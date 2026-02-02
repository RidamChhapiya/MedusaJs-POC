import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-sm font-medium text-ui-fg-base">Select {title}</span>
      <div
        className="flex flex-wrap gap-2"
        data-testid={dataTestId}
      >
        {filteredOptions.map((v) => {
          return (
            <button
              onClick={() => updateOption(option.id, v)}
              key={v}
              className={clx(
                "border text-small-regular rounded-lg px-4 py-2.5 min-h-10 max-w-full",
                "bg-ui-bg-subtle border-ui-border-base text-center break-words transition-all duration-150",
                "min-w-0 shrink-0 basis-auto",
                {
                  "border-2 border-ui-border-interactive ring-1 ring-ui-border-interactive bg-ui-bg-base": v === current,
                  "hover:border-ui-border-strong hover:shadow-elevation-card-rest": v !== current && !disabled,
                }
              )}
              disabled={disabled}
              data-testid="option-button"
              title={v}
            >
              <span className="line-clamp-2">{v}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
