document.addEventListener("DOMContentLoaded", () => {
	const addressDiv = document.getElementById("address")
	const exportButton = document.getElementById("exportButton")
	const deleteButton = document.getElementById("deleteButton")
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
					exportButton.disabled = true
					deleteButton.disabled = true
					return false
				}
			}
			return true
		} catch (error) {
			console.error("Permission error:", error)
			errorDiv.textContent = `Failed to initialize: ${error.message}`
			exportButton.disabled = true
			deleteButton.disabled = true
			return false
		}
	}

	initialize().then((hasPermission) => {
		if (!hasPermission) return

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (!tabs[0]) {
				addressDiv.textContent = "No active tab found."
				exportButton.disabled = true
				deleteButton.disabled = true
				errorDiv.textContent = "Please open a Zillow page."
				return
			}

			chrome.tabs.sendMessage(
				tabs[0].id,
				{ action: "extractAddress" },
				(response) => {
					if (chrome.runtime.lastError) {
						addressDiv.textContent = "Error extracting data."
						exportButton.disabled = true
						deleteButton.disabled = true
						errorDiv.textContent = chrome.runtime.lastError.message
						return
					}

					if (!response || response.gdpClientCache === null) {
						addressDiv.textContent = "No data found."
						exportButton.disabled = true
						deleteButton.disabled = true
						errorDiv.textContent =
							response?.error || "Could not parse property data on this page."
						return
					}

					// Display generic message
					addressDiv.textContent = "Data for this property saved"

					deleteButton.setAttribute(
						"data-zpid",
						Object.keys(response.gdpClientCache)[0]
					)
					exportButton.disabled = false
					deleteButton.disabled = false
				}
			)
		})

		deleteButton.addEventListener("click", () => {
			statusDiv.textContent = ""
			errorDiv.textContent = ""
			const zpid = deleteButton.getAttribute("data-zpid")
			if (!zpid) {
				errorDiv.textContent = "Missing property zpid."
				return
			}

			chrome.runtime.sendMessage(
				{ action: "deleteAddress", zpid },
				(response) => {
					if (response && response.success) {
						if (response && response.success) {
							statusDiv.textContent = "Data deleted successfully!"
						} else {
							errorDiv.textContent =
								response && response.error
									? response.error
									: "Failed to delete data."
						}
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
