document.addEventListener("DOMContentLoaded", () => {
	const addressDiv = document.getElementById("address")
	const saveButton = document.getElementById("saveButton")
	const exportButton = document.getElementById("exportButton")
	const statusDiv = document.getElementById("status")
	const errorDiv = document.getElementById("error")

	// Check if storage permission is granted
	const checkStoragePermission = () => {
		return new Promise((resolve) => {
			chrome.permissions.contains({ permissions: ["storage"] }, (granted) => {
				console.log("Storage permission granted:", granted)
				resolve(granted)
			})
		})
	}

	// Request storage permission
	const requestStoragePermission = () => {
		return new Promise((resolve, reject) => {
			chrome.permissions.request({ permissions: ["storage"] }, (granted) => {
				console.log("Storage permission request result:", granted)
				if (granted) {
					resolve()
				} else {
					reject(new Error("Storage permission denied by user."))
				}
			})
		})
	}

	// Initialize permissions
	const initialize = async () => {
		try {
			let hasPermission = await checkStoragePermission()
			if (!hasPermission) {
				console.log("Requesting storage permission...")
				await requestStoragePermission()
				hasPermission = await checkStoragePermission()
				if (!hasPermission) {
					errorDiv.textContent = "Storage permission denied. Cannot save data."
					saveButton.disabled = true
					exportButton.disabled = true
					return false
				}
			}
			return true
		} catch (error) {
			console.error("Permission error:", error)
			errorDiv.textContent = `Failed to initialize: ${error.message}`
			saveButton.disabled = true
			exportButton.disabled = true
			return false
		}
	}

	initialize().then((hasPermission) => {
		if (!hasPermission) return

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (!tabs[0]) {
				addressDiv.textContent = "No active tab found."
				saveButton.disabled = true
				errorDiv.textContent = "Please open a Zillow page."
				return
			}

			chrome.tabs.sendMessage(
				tabs[0].id,
				{ action: "extractAddress" },
				(response) => {
					if (chrome.runtime.lastError) {
						addressDiv.textContent = "Error extracting data."
						saveButton.disabled = true
						errorDiv.textContent = chrome.runtime.lastError.message
						return
					}

					if (!response || response.gdpClientCache === null) {
						addressDiv.textContent = "No data found."
						saveButton.disabled = true
						errorDiv.textContent =
							response?.error || "Could not parse property data on this page."
						return
					}

					// Display generic message
					addressDiv.textContent = "Data for this property saved"

					// Store gdpClientCache as JSON string in data attribute
					saveButton.setAttribute(
						"data-gdpClientCache",
						JSON.stringify(response.gdpClientCache)
					)
					saveButton.disabled = false
				}
			)
		})

		saveButton.addEventListener("click", () => {
			statusDiv.textContent = ""
			errorDiv.textContent = ""

			if (
				addressDiv.textContent === "No data found." ||
				addressDiv.textContent === "Loading address..."
			) {
				errorDiv.textContent = "No valid data to save."
				return
			}

			const gdpClientCacheStr = saveButton.getAttribute("data-gdpClientCache")
			if (!gdpClientCacheStr) {
				errorDiv.textContent = "Missing property data."
				return
			}

			let gdpClientCache
			try {
				gdpClientCache = JSON.parse(gdpClientCacheStr)
			} catch (error) {
				errorDiv.textContent = "Invalid property data format."
				console.error("Error parsing gdpClientCache:", error)
				return
			}

			chrome.runtime.sendMessage(
				{ action: "saveAddress", gdpClientCache },
				(response) => {
					if (response && response.success) {
						statusDiv.textContent =
							'Data saved successfully! Use "Export Addresses" to download addresses.json.'
					} else {
						errorDiv.textContent =
							response && response.error
								? response.error
								: "Failed to save data."
					}
				}
			)
		})

		exportButton.addEventListener("click", () => {
			statusDiv.textContent = ""
			errorDiv.textContent = ""

			chrome.runtime.sendMessage({ action: "exportAddresses" }, (response) => {
				if (
					response &&
					response.addresses &&
					Object.keys(response.addresses).length > 0
				) {
					const blob = new Blob([JSON.stringify(response.addresses, null, 2)], {
						type: "application/json"
					})
					const url = URL.createObjectURL(blob)
					const a = document.createElement("a")
					a.href = url
					a.download = "addresses.json"
					a.click()
					URL.revokeObjectURL(url)
					statusDiv.textContent = "Data exported as addresses.json"
				} else {
					errorDiv.textContent = "No data to export."
				}
			})
		})
	})
})
