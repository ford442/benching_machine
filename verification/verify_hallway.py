
from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000")

            # Verify Title
            # Note: The app title might be generic "React App" or something else from index.html.
            # We care about the content.

            # Wait for the "WASM Max (Threads+SIMD)" text to appear.
            # This confirms BenchmarkRunner.js is loaded and our rename is present.
            print("Checking for renamed rack...")
            page.wait_for_selector("text=WASM Max (Threads+SIMD)")
            print("Found renamed rack.")

            # Verify the Grid View button is active by default (or we click it)
            # Based on the code, default viewMode is '2d' which corresponds to Grid View.
            print("Checking for Grid View button...")
            grid_btn = page.locator("button.view-button", has_text="Grid View")
            if "active" not in grid_btn.get_attribute("class"):
                print("Grid View not active, clicking...")
                grid_btn.click()
            else:
                print("Grid View is active.")

            # Verify the Log Scale button exists
            print("Checking for Log Scale button...")
            log_btn = page.locator("button.view-button", has_text="Linear Scale")
            if log_btn.is_visible():
                print("Linear Scale button visible. Clicking to toggle...")
                log_btn.click()
                page.wait_for_selector("text=Log Scale (On)")
                print("Log Scale toggled on.")
            else:
                print("Log Scale button not found or already on?")
                if page.is_visible("text=Log Scale (On)"):
                    print("Already on Log Scale.")

            # Take a screenshot of the grid view
            page.screenshot(path="verification/hallway_grid.png")
            print("Screenshot saved to verification/hallway_grid.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
