from typing import Dict, List


def analyze_prices_tool(price_data: List[Dict]) -> Dict:
    """
    Analyze price data from multiple stores.
    
    Args:
        price_data: List of price information from different stores
        
    Returns:
        Analysis with totals, comparisons, and recommendations
    """
    stores = {}
    
    for item in price_data:
        store = item["store"]
        if store not in stores:
            stores[store] = {
                "total_cost": 0.0,
                "items": [],
                "items_available": 0,
                "items_missing": 0
            }
        
        if item.get("available", True):
            stores[store]["total_cost"] += item["price"]
            stores[store]["items_available"] += 1
        else:
            stores[store]["items_missing"] += 1
        
        stores[store]["items"].append(item)
    
    # Find cheapest store
    cheapest_store = min(stores.items(), key=lambda x: x[1]["total_cost"])
    cheapest_name = cheapest_store[0]
    cheapest_cost = cheapest_store[1]["total_cost"]
    
    # Calculate savings
    comparisons = []
    for store_name, store_data in stores.items():
        savings = store_data["total_cost"] - cheapest_cost
        comparisons.append({
            "store": store_name,
            "total_cost": store_data["total_cost"],
            "items_available": store_data["items_available"],
            "items_missing": store_data["items_missing"],
            "savings": savings
        })
    
    return {
        "stores": stores,
        "cheapest_store": cheapest_name,
        "cheapest_cost": cheapest_cost,
        "comparisons": comparisons
    }


def select_best_store_tool(analysis: Dict, user_preferences: Dict = None) -> Dict:
    """
    Select the best store based on price analysis and user preferences.
    
    Args:
        analysis: Price analysis from analyze_prices_tool
        user_preferences: Optional user preferences (proximity, delivery, etc.)
        
    Returns:
        Shopping decision with recommended store and reasoning
    """
    cheapest_store = analysis["cheapest_store"]
    cheapest_cost = analysis["cheapest_cost"]
    comparisons = analysis["comparisons"]
    
    # Simple logic: recommend cheapest store
    # TODO: Add more sophisticated logic (delivery, proximity, etc.)
    
    # Calculate total savings compared to most expensive
    most_expensive = max(comparisons, key=lambda x: x["total_cost"])
    total_savings = most_expensive["total_cost"] - cheapest_cost
    
    reason = f"{cheapest_store.capitalize()} offers the best total price at €{cheapest_cost:.2f}. "
    reason += f"You save €{total_savings:.2f} compared to {most_expensive['store'].capitalize()}."
    
    # Get items for the recommended store
    store_data = analysis["stores"][cheapest_store]
    items = [
        {
            "name": item["ingredient"],
            "quantity": 1,
            "price": item["price"],
            "unit_price": item["unit_price"]
        }
        for item in store_data["items"]
    ]
    
    return {
        "recommended_store": cheapest_store,
        "total_cost": cheapest_cost,
        "total_savings": total_savings,
        "reason": reason,
        "comparisons": comparisons,
        "items": items
    }
