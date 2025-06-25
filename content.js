console.log("Content script loaded on:", window.location.href) // Confirm script runs

// Function to parse gdpClientCache
function parseGdpClientCache() {
	console.log("parseGdpClientCache called")
	const scriptTag = document.getElementById("__NEXT_DATA__")
	if (!scriptTag) {
		console.error("Script tag with id __NEXT_DATA__ not found")
		return { error: "Missing __NEXT_DATA__ script tag" }
	}

	let nextData
	try {
		nextData = JSON.parse(scriptTag.textContent)
		console.log("Parsed __NEXT_DATA__:", nextData) // Debug: Log full __NEXT_DATA__
	} catch (error) {
		console.error("Error parsing __NEXT_DATA__ JSON:", error)
		console.log("Raw __NEXT_DATA__ content:", scriptTag.textContent) // Debug: Log raw content
		return { error: `Failed to parse __NEXT_DATA__ JSON: ${error.message}` }
	}

	try {
		const gdpClientCacheString =
			nextData?.props?.pageProps?.componentProps?.gdpClientCache
		if (!gdpClientCacheString) {
			console.error("gdpClientCache not found in __NEXT_DATA__ structure")
			console.log("__NEXT_DATA__ structure:", nextData) // Debug: Log structure
			return { error: "gdpClientCache not found in data structure" }
		}

		// Step 1: Clean the string
		let cleanedString = gdpClientCacheString.trim()

		// Log raw string for debugging
		console.log(
			"Raw gdpClientCache string (first 100 chars):",
			cleanedString.slice(0, 100)
		)

		// Step 2: Remove outer quotes if present
		if (cleanedString.startsWith('"') && cleanedString.endsWith('"')) {
			cleanedString = cleanedString.slice(1, -1)
		}

		// Step 3: Unescape the double-escaped JSON
		try {
			// Replace double-escaped quotes and backslashes
			cleanedString = cleanedString.replace(/\\{2,}"/g, '"')
			cleanedString = cleanedString.replace(/\\{2,}\\/g, "\\")
			// Remove control characters and unwanted escapes
			cleanedString = cleanedString
				.replace(/\\n/g, "") // Remove newlines
				.replace(/\\t/g, "") // Remove tabs
				.replace(/\\r/g, "") // Remove carriage returns
				.replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove control characters

			console.log(
				"Cleaned gdpClientCache string (first 100 chars):",
				cleanedString.slice(0, 100)
			)

			// Step 4: Validate string
			if (
				!cleanedString.startsWith('{"ForSaleShopperPlatformFullRenderQuery')
			) {
				console.warn(
					"Unexpected gdpClientCache structure, expected query key not found"
				)
				console.log("Cleaned string start:", cleanedString.slice(0, 50))
			}

			// Step 5: Parse the cleaned JSON
			const parsedData = JSON.parse(cleanedString)
			console.log("Parsed gdpClientCache:", parsedData) // Debug: Log parsed data

			// Step 6: Normalize and filter data
			const complexKey = Object.keys(parsedData)[0]
			console.log("complexKey", complexKey)
			if (
				complexKey &&
				complexKey.startsWith("ForSaleShopperPlatformFullRenderQuery")
			) {
				try {
					const query = JSON.parse(
						complexKey.replace("ForSaleShopperPlatformFullRenderQuery", "")
					)
					const zpid = query.zpid || parsedData[complexKey].property?.zpid
					console.log("zpid - found in query", zpid)
					if (!zpid) {
						throw new Error("ZPID not found in query or response.property")
					}

					// Filter property object to exclude specified fields
					const {
						adTargets,
						apartmentsForRentInZipcodeSearchUrl,
						collections,
						nearbyCities,
						nearbyHomes,
						nearbyNeighborhoods,
						nearbyZipcodes,
						submitFlow,
						topNavJson,
						...filteredProperty
					} = parsedData[complexKey].property

					// Structure data with zpid as key
					const filteredData = {
						[zpid]: {
							property: filteredProperty,
							odpPropertyModels:
								parsedData[complexKey].zgProperty?.odpPropertyModels
						}
					}
					console.log("Normalized and filtered gdpClientCache:", filteredData)
					return { data: filteredData }
				} catch (keyError) {
					console.error(
						"Error processing complex key or filtering data:",
						keyError
					)
					// Fallback to unnormalized data with minimal filtering
					const zpid = parsedData[complexKey].property?.zpid
					console.log("fallback zpid", zpid)
					if (!zpid) {
						return { error: "ZPID not found in response.property" }
					}
					const {
						adTargets,
						apartmentsForRentInZipcodeSearchUrl,
						collections,
						nearbyCities,
						nearbyHomes,
						nearbyNeighborhoods,
						nearbyZipcodes,
						submitFlow,
						topNavJson,
						...filteredProperty
					} = parsedData[complexKey].property
					const filteredData = {
						[zpid]: {
							property: filteredProperty,
							odpPropertyModels:
								parsedData[complexKey].zgProperty?.odpPropertyModels
						}
					}
					return { data: filteredData }
				}
			}

			// Fallback if key doesn't match expected format
			const zpid = parsedData[Object.keys(parsedData)[0]]?.property?.zpid
			if (!zpid) {
				return { error: "ZPID not found in data" }
			}
			console.log("zpid fallback doesn't match", zpid)
			const {
				adTargets,
				apartmentsForRentInZipcodeSearchUrl,
				collections,
				nearbyCities,
				nearbyHomes,
				nearbyNeighborhoods,
				nearbyZipcodes,
				submitFlow,
				topNavJson,
				...filteredProperty
			} = parsedData[Object.keys(parsedData)[0]].property
			const filteredData = {
				[zpid]: {
					property: filteredProperty,
					odpPropertyModels:
						parsedData[Object.keys(parsedData)[0]].zgProperty?.odpPropertyModels
				}
			}
			return { data: filteredData }
		} catch (error) {
			// Enhanced error logging
			console.error("Error parsing gdpClientCache:", error)
			const position = error.message.match(/position (\d+)/)?.[1]
			if (position) {
				const pos = parseInt(position)
				const start = Math.max(0, pos - 50)
				const end = pos + 50
				console.log(
					"Error context (position",
					pos,
					"):",
					cleanedString.slice(start, end)
				)
				console.log("Characters around error:", {
					before: cleanedString.slice(pos - 5, pos),
					at: cleanedString[pos],
					after: cleanedString.slice(pos + 1, pos + 6)
				})
			}
			console.log(
				"Raw gdpClientCache string (first 500 chars):",
				gdpClientCacheString.slice(0, 500)
			)
			console.log(
				"Cleaned gdpClientCache string (first 500 chars):",
				cleanedString.slice(0, 500)
			)
			return {
				error: `Failed to parse gdpClientCache: ${error.message}`,
				rawGdpClientCache: gdpClientCacheString
			}
		}
	} catch (error) {
		console.error("Unexpected error in parseGdpClientCache:", error)
		return {
			error: `Unexpected error in parseGdpClientCache: ${error.message}`
		}
	}
}

// Wait for __NEXT_DATA__ to load using MutationObserver
function waitForNextData(timeoutMs = 10000) {
	console.log("waitForNextData started")
	return new Promise((resolve) => {
		// Check if page is a Zillow property page
		if (!window.location.href.match(/\/homedetails\/.*_zpid/)) {
			console.log("Not a Zillow property page:", window.location.href)
			resolve({ error: "Not a Zillow property page" })
			return
		}

		const scriptTag = document.getElementById("__NEXT_DATA__")
		if (scriptTag) {
			console.log("__NEXT_DATA__ found immediately")
			resolve(parseGdpClientCache())
			return
		}

		console.log("Starting MutationObserver for __NEXT_DATA__")
		const observer = new MutationObserver((mutations, obs) => {
			const scriptTag = document.getElementById("__NEXT_DATA__")
			if (scriptTag) {
				console.log("__NEXT_DATA__ detected by MutationObserver")
				obs.disconnect()
				resolve(parseGdpClientCache())
			}
		})

		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		})

		// Fallback timeout
		setTimeout(() => {
			observer.disconnect()
			console.error("Timed out waiting for __NEXT_DATA__")
			resolve({ error: "Timed out waiting for __NEXT_DATA__ script tag" })
		}, timeoutMs)
	}).catch((error) => {
		console.error("Unexpected error in waitForNextData:", error)
		return { error: `Unexpected error in waitForNextData: ${error.message}` }
	})
}

// Register message listener immediately
try {
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		console.log("Message received:", request)
		if (request.action === "extractAddress") {
			console.log("Running data extraction for URL:", window.location.href)
			waitForNextData()
				.then((result) => {
					if (result.error) {
						console.log("Extraction failed:", result.error)
						sendResponse({
							gdpClientCache: null,
							error: result.error,
							rawGdpClientCache: result.rawGdpClientCache
						})
					} else {
						console.log("Extracted gdpClientCache:", result.data)
						// Save filtered data to local storage under "addresses" key
						try {
							const zpid = Object.keys(result.data)[0]
							const propertyData = result.data[zpid]
							chrome.storage.local.get(["addresses"], (data) => {
								if (chrome.runtime.lastError) {
									console.error(
										"Error retrieving addresses from local storage:",
										chrome.runtime.lastError
									)
									sendResponse({
										gdpClientCache: result.data,
										error: `Failed to retrieve addresses from local storage: ${chrome.runtime.lastError.message}`
									})
									return
								}
								const addresses = data.addresses || {}
								addresses[zpid] = propertyData // Add or update the zpid entry
								chrome.storage.local.set({ addresses }, () => {
									if (chrome.runtime.lastError) {
										console.error(
											"Error saving to local storage:",
											chrome.runtime.lastError
										)
										sendResponse({
											gdpClientCache: result.data,
											error: `Failed to save to local storage: ${chrome.runtime.lastError.message}`
										})
									} else {
										console.log(
											"Saved to local storage under addresses with zpid:",
											zpid
										)
										sendResponse({ gdpClientCache: result.data })
									}
								})
							})
						} catch (storageError) {
							console.error(
								"Unexpected error saving to local storage:",
								storageError
							)
							sendResponse({
								gdpClientCache: result.data,
								error: `Unexpected error saving to local storage: ${storageError.message}`
							})
						}
					}
				})
				.catch((error) => {
					console.error("Fatal error in extraction:", error)
					sendResponse({
						gdpClientCache: null,
						error: `Fatal error in extraction: ${error.message}`
					})
				})
			return true // Indicate async response
		}
		sendResponse({ error: `Unknown action: ${request.action}` })
		return true
	})
	console.log("Message listener registered successfully")
} catch (error) {
	console.error("Error registering message listener:", error)
}

// Log to confirm script completion
console.log("Content script initialization complete")
