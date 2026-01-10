from playwright.sync_api import sync_playwright, expect
import time
import re

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # 1. Load the page
        print("Navigating to http://localhost:3000...")
        try:
            page.goto("http://localhost:3000", timeout=60000)
        except Exception as e:
            print(f"Failed to load page: {e}")
            with open("npm_output.log", "r") as f:
                print(f.read())
            return

        # Wait for the main component to load
        print("Waiting for .hallway-visualization...")
        try:
            page.wait_for_selector(".hallway-visualization", timeout=30000)
        except Exception as e:
            print(f"Timeout waiting for selector: {e}")
            page.screenshot(path="verification/failed_load.png")
            return

        # 2. Verify Grid Mode (Macro View)
        expect(page.locator(".view-controls")).to_be_visible()

        # Check if Grid View button is active
        grid_btn = page.locator("button:has-text('Distant Grid')")
        expect(grid_btn).to_have_class(re.compile(r"active"))

        print("Taking screenshot of Grid View...")
        page.screenshot(path="verification/1_grid_view.png")

        # 3. Verify Click to Detail View (Micro View)
        # Ensure data is loaded
        print("Waiting for data to load...")
        page.wait_for_selector(".future-note:has-text('Racks Online')", timeout=10000)

        # NOTE: It seems the canvas size is being reported as 0 in headless mode sometimes,
        # or the ResizeObserver hasn't fired yet properly.
        # We will try to force a resize or wait longer.
        page.wait_for_timeout(3000)

        print("Clicking on canvas to zoom...")
        # Try clicking via JS with absolute coordinates which might work better if layout is quirky
        page.evaluate("""
            const canvas = document.querySelector('.hallway-canvas');
            const rect = canvas.getBoundingClientRect();
            // Fallback to center if rect is weird, but try top left rack area
            const clickX = rect.left + 50;
            const clickY = rect.top + 50;
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: clickX,
                clientY: clickY
            });
            canvas.dispatchEvent(event);
        """)

        # Wait for transition
        print("Waiting for transition to Detailed Row...")
        row_btn = page.locator("button:has-text('Detailed Row')")
        try:
            expect(row_btn).to_have_class(re.compile(r"active"), timeout=5000)
            print("Transition successful.")
        except AssertionError:
            print("Transition failed. Trying to click the button directly as fallback to show view.")
            row_btn.click() # Fallback to button click to at least verify the view renders

        print("Taking screenshot of Detailed Row View...")
        page.screenshot(path="verification/2_detailed_view.png")

        # 4. Verify Log Scale Toggle
        print("Toggling Log Scale...")
        log_btn = page.locator("button:has-text('Log Scale')")
        log_btn.click()
        expect(log_btn).to_have_class(re.compile(r"active"))
        print("Taking screenshot of Log Scale...")
        page.screenshot(path="verification/3_log_scale.png")

        # 5. Verify Filter (Click a test bar)
        print("Clicking a test bar to filter...")
        # In Row view: startX=40, startY=120
        # Click x=100 (inside first rack), y=135 (inside first bar)

        page.evaluate("""
            const canvas = document.querySelector('.hallway-canvas');
            const rect = canvas.getBoundingClientRect();
            const clickX = rect.left + 100;
            const clickY = rect.top + 135;
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: clickX,
                clientY: clickY
            });
            canvas.dispatchEvent(event);
        """)

        # Check if filter button appeared
        print("Waiting for Clear Filter button...")
        clear_btn = page.locator("button:has-text('Clear Filter')")
        try:
             expect(clear_btn).to_be_visible(timeout=5000)
             print("Filter applied.")
        except AssertionError:
             print("Filter failed to apply.")

        print("Taking screenshot of Filtered View...")
        page.screenshot(path="verification/4_filtered_view.png")

        # 6. Verify Benchmark Runner Scroll
        runner_list = page.locator(".tech-stack-vertical")
        expect(runner_list).to_be_visible()
        expect(runner_list).to_contain_text("WASM + OpenMP")

        print("Taking screenshot of Runner List...")
        page.screenshot(path="verification/5_runner_list.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
