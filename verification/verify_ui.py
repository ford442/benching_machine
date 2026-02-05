from playwright.sync_api import Page, expect, sync_playwright
import time

def test_benchmark_runner(page: Page):
    print("Navigating to http://localhost:3000...")
    page.goto("http://localhost:3000")

    # 1. Verify New Configurations in the List (Racks)
    print("Verifying Racks...")
    expect(page.get_by_text("AssemblyScript Suite")).to_be_visible()
    expect(page.get_by_text("WASM + OpenMP")).to_be_visible()
    expect(page.get_by_text("WebGPU Compute")).to_be_visible()

    print("Racks found. Taking screenshot of initial state.")
    page.screenshot(path="verification/verify_ui.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_benchmark_runner(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
