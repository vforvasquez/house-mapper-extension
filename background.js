chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "saveAddress") {
		const { gdpClientCache } = request
		if (gdpClientCache) {
			// Use zpid as key if available, otherwise generate a unique key
			const key =
				gdpClientCache.zpid?.toString() ||
				`property_${Date.now()}_${Math.random().toString(36).slice(2)}`

			chrome.storage.local.get(["addresses"], (result) => {
				const addresses = result.addresses || {}
				addresses[key] = gdpClientCache
				chrome.storage.local.set({ addresses }, () => {
					console.log(`Data saved for key ${key}:`, gdpClientCache)
					sendResponse({ success: true })
				})
			})
			return true // Keep message channel open for async storage
		} else {
			sendResponse({
				success: false,
				error: "Missing property data."
			})
		}
	} else if (request.action === "exportAddresses") {
		chrome.storage.local.get(["addresses"], (result) => {
			sendResponse({ addresses: result.addresses || {} })
		})
		return true // Keep message channel open for async storage
	}
})
