# workers/scraper.py
import sys
import json
from playwright.sync_api import sync_playwright

def get_best_price(item_name: str):
    """
    Launches a headless browser, searches for an item on Barbora,
    and scrapes the unit price of the best-value product.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # Navigate to the search results page directly
            search_url = f"https://barbora.lt/paieska?q={item_name}"
            page.goto(search_url, wait_until="domcontentloaded")

            # Wait for the product list to appear, or for the "not found" message
            try:
                page.wait_for_selector('li[data-testid^="product-card"]', timeout=10000)
            except Exception:
                # If product cards don't appear, check for the warning message
                not_found_element = page.query_selector(".b-alert--warning")
                if not_found_element:
                    print(f"Item '{item_name}' not found on Barbora.", file=sys.stderr)
                    return None
                else:
                    raise # Re-raise the timeout error if neither is found

            # Get all product cards
            all_cards = page.query_selector_all('li[data-testid^="product-card"]')
            
            if not all_cards:
                return None

            lowest_price = float('inf')

            for card in all_cards:
                # The unit price is inside the Shadow DOM
                unit_price_element = card.query_selector('div.text-2xs')
                if unit_price_element:
                    text = unit_price_element.inner_text()
                    # "2,30 €/l" -> "2,30" -> "2.30" -> 2.30
                    price_str = text.split('€')[0].replace(',', '.').strip()
                    try:
                        price = float(price_str)
                        if price < lowest_price:
                            lowest_price = price
                    except ValueError:
                        continue

            return lowest_price if lowest_price != float('inf') else None

        except Exception as e:
            print(f"An error occurred during scraping for '{item_name}': {e}", file=sys.stderr)
            return None
        finally:
            browser.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        item_to_search = sys.argv[1]
        best_price = get_best_price(item_to_search)
        
        # The output of this script is a JSON string, which is easy for other programs to read.
        result = {"item": item_to_search, "price": best_price}
        print(json.dumps(result))
