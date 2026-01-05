import { Text } from "@medusajs/ui"

import Medusa from "../../../common/icons/medusa"
import NextJs from "../../../common/icons/nextjs"

const MedusaCTA = () => {
  return (
    <Text className="flex gap-x-2 txt-compact-small-plus items-center text-grey-60 dark:text-grey-40">
      Powered by
      <a href="https://www.medusajs.com" target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">
        <Medusa fill="#9ca3af" className="fill-[#9ca3af] dark:fill-grey-40" />
      </a>
      &
      <a href="https://nextjs.org" target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">
        <NextJs fill="#9ca3af" className="dark:fill-grey-40" />
      </a>
    </Text>
  )
}

export default MedusaCTA
