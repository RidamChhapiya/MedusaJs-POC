import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { Text, clx } from "@medusajs/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MedusaCTA from "@modules/layout/components/medusa-cta"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  return (
    <footer className="border-t border-ui-border-base dark:border-grey-50 w-full bg-white dark:bg-grey-60">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-40">
          <div>
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus text-ui-fg-subtle dark:text-grey-30 hover:text-ui-fg-base dark:hover:text-grey-10 uppercase"
            >
              Medusa Store
            </LocalizedClientLink>
          </div>
          <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-4 w-full xsmall:w-auto max-w-4xl">
            <div className="flex flex-col gap-y-2" data-testid="footer-support-account">
              <span className="txt-small-plus txt-ui-fg-base dark:text-grey-10">
                Support & account
              </span>
              <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle dark:text-grey-30 txt-small">
                <li>
                  <LocalizedClientLink
                    href="/my-numbers"
                    className="hover:text-ui-fg-base dark:hover:text-grey-10 text-grey-70 dark:text-grey-30"
                  >
                    My Numbers
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/customer-service"
                    className="hover:text-ui-fg-base dark:hover:text-grey-10 text-grey-70 dark:text-grey-30"
                  >
                    Customer Support
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account"
                    className="hover:text-ui-fg-base dark:hover:text-grey-10 text-grey-70 dark:text-grey-30"
                  >
                    Account
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>
            {productCategories && productCategories?.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base dark:text-grey-10">
                  Categories
                </span>
                <ul
                  className="grid grid-cols-1 gap-2"
                  data-testid="footer-categories"
                >
                  {productCategories?.slice(0, 6).map((c) => {
                    if (c.parent_category) {
                      return
                    }

                    const children =
                      c.category_children?.map((child) => ({
                        name: child.name,
                        handle: child.handle,
                        id: child.id,
                      })) || null

                    return (
                      <li
                        className="flex flex-col gap-2 text-ui-fg-subtle dark:text-grey-30 txt-small"
                        key={c.id}
                      >
                        <LocalizedClientLink
                          className={clx(
                            "hover:text-ui-fg-base dark:hover:text-grey-10 text-grey-70 dark:text-grey-30",
                            children && "txt-small-plus"
                          )}
                          href={`/categories/${c.handle}`}
                          data-testid="category-link"
                        >
                          {c.name}
                        </LocalizedClientLink>
                        {children && (
                          <ul className="grid grid-cols-1 ml-3 gap-2">
                            {children &&
                              children.map((child) => (
                                <li key={child.id}>
                                  <LocalizedClientLink
                                    className="hover:text-ui-fg-base dark:hover:text-grey-10 text-grey-70 dark:text-grey-30"
                                    href={`/categories/${child.handle}`}
                                    data-testid="category-link"
                                  >
                                    {child.name}
                                  </LocalizedClientLink>
                                </li>
                              ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base dark:text-grey-10">
                  Collections
                </span>
                <ul
                  className={clx(
                    "grid grid-cols-1 gap-2 text-ui-fg-subtle dark:text-grey-30 txt-small",
                    {
                      "grid-cols-2": (collections?.length || 0) > 3,
                    }
                  )}
                >
                  {collections?.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base dark:hover:text-grey-10 text-grey-70 dark:text-grey-30"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus txt-ui-fg-base dark:text-grey-10">Medusa</span>
              <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle dark:text-grey-30 txt-small">
                <li>
                  <a
                    href="https://github.com/medusajs"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ui-fg-base dark:hover:text-grey-10 text-grey-70 dark:text-grey-30"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://docs.medusajs.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ui-fg-base dark:hover:text-grey-10 text-grey-70 dark:text-grey-30"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/medusajs/nextjs-starter-medusa"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ui-fg-base dark:hover:text-grey-10 text-grey-70 dark:text-grey-30"
                  >
                    Source code
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex w-full mb-16 justify-between text-ui-fg-muted dark:text-grey-40">
          <Text className="txt-compact-small text-grey-60 dark:text-grey-40">
            © {new Date().getFullYear()} Medusa Store. All rights reserved.
          </Text>
          <MedusaCTA />
        </div>
      </div>
    </footer>
  )
}
