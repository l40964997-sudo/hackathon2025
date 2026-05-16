import { Search } from 'lucide-react'

const CATEGORY_LABELS = {
  all: 'All',
  smartphone: 'Phones',
  subscription: 'Subscriptions',
  prepaid: 'Prepaid',
  accessory: 'Accessories',
  tablet: 'Tablets',
  wearable: 'Wearables',
}

export function FilterBar({
  categories, category, onCategory,
  search, onSearch,
  sort, onSort,
  resultCount,
}) {
  const allCategories = [{ category: 'all', count: null }, ...categories]
  return (
    <section className="filterbar">
      <div className="filterbar-row">
        <div className="search">
          <Search size={16} strokeWidth={2} />
          <input
            type="search"
            placeholder="Search phones, plans, accessories…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <select
          className="sort"
          value={sort}
          onChange={(e) => onSort(e.target.value)}
        >
          <option value="featured">Featured</option>
          <option value="price_asc">Price · low to high</option>
          <option value="price_desc">Price · high to low</option>
          <option value="name">Name · A–Z</option>
        </select>
      </div>

      <div className="category-pills" role="tablist">
        {allCategories.map((c) => (
          <button
            key={c.category}
            role="tab"
            aria-selected={category === c.category}
            className={'pill' + (category === c.category ? ' pill--active' : '')}
            onClick={() => onCategory(c.category)}
          >
            {CATEGORY_LABELS[c.category] || c.category}
            {c.count != null && <span className="pill-count">{c.count}</span>}
          </button>
        ))}
        <span className="results-meta">{resultCount} results</span>
      </div>
    </section>
  )
}
