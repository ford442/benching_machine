from playwright.sync_api import Page, expect, sync_playwright
import time

def test_benchmark_runner_scroll(page: Page):
    print("Navigating to http://localhost:3000...")
    page.goto("http://localhost:3000")

    # 1. Locate the container and scroll it
    print("Scrolling sidebar...")
    # The racks are in .tech-stack-vertical. It might be scrollable if fixed height?
    # Or the whole .runner-card or .benchmark-runner might be scrollable.
    # I'll try to scroll the .tech-badge-row containing "WebGPU Compute" into view.

    # AssemblyScript Suite
    as_suite = page.get_by_text("AssemblyScript Suite")
    as_suite.scroll_into_view_if_needed()

    # Take screenshot of middle section
    page.screenshot(path="verification/verify_scroll_1.png")

    # Scroll to bottom
    webgpu = page.get_by_text("WebGPU Compute")
    webgpu.scroll_into_view_if_needed()

    # Take screenshot of bottom section
    page.screenshot(path="verification/verify_scroll_2.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_benchmark_runner_scroll(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
