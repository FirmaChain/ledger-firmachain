/** ******************************************************************************
 *  (c) 2018 - 2024 Zondax AG
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ******************************************************************************* */

import Zemu, { zondaxMainmenuNavigation, ButtonKind, isTouchDevice } from '@zondax/zemu'
import  CosmosApp  from '@zondax/ledger-cosmos-js'
import { defaultOptions, DEVICE_MODELS } from './common'

jest.setTimeout(90000)

describe('Standard', function () {
  test.concurrent.each(DEVICE_MODELS)('can start and stop container', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('main menu', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
      const nav = zondaxMainmenuNavigation(m.name, [1, 0, 0, 4, -5])
      await sim.navigateAndCompareSnapshots('.', `${m.prefix.toLowerCase()}-mainmenu`, nav.schedule)
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('get app version', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
      const app = new CosmosApp(sim.getTransport())
      const resp = await app.getVersion()

      console.log(resp)

      expect(resp).toHaveProperty('major')
      expect(resp).toHaveProperty('minor')
      expect(resp).toHaveProperty('patch')
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('get address', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({ ...defaultOptions, model: m.name })
      const app = new CosmosApp(sim.getTransport())

      // Derivation path. First 3 items are automatically hardened!
      const path = "m/44'/7777777'/5'/0/3"
      const resp = await app.getAddressAndPubKey(path, 'firma')

      console.log(resp)

      expect(resp).toHaveProperty('bech32_address')
      expect(resp).toHaveProperty('compressed_pk')

      expect(resp.bech32_address).toMatch(/^firma1/)
      expect(resp.compressed_pk.length).toEqual(33)
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('show address', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({
        ...defaultOptions,
        model: m.name,
        approveKeyword: isTouchDevice(m.name) ? 'Confirm' : '',
        approveAction: ButtonKind.DynamicTapButton,
      })
      const app = new CosmosApp(sim.getTransport())

      // Derivation path. First 3 items are automatically hardened!
      const path = "m/44'/7777777'/5'/0/3"
      const respRequest = app.showAddressAndPubKey(path, 'firma')
      // Wait until we are not in the main menu
      await sim.waitUntilScreenIsNot(sim.getMainMenuSnapshot())
      await sim.compareSnapshotsAndApprove('.', `${m.prefix.toLowerCase()}-show_address`)

      const resp = await respRequest
      console.log(resp)

      expect(resp).toHaveProperty('bech32_address')
      expect(resp).toHaveProperty('compressed_pk')

      expect(resp.bech32_address).toMatch(/^firma1/)
      expect(resp.compressed_pk.length).toEqual(33)
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('show address HUGE', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({
        ...defaultOptions,
        model: m.name,
        approveKeyword: isTouchDevice(m.name) ? 'Confirm' : '',
        approveAction: ButtonKind.DynamicTapButton,
      })
      const app = new CosmosApp(sim.getTransport())

      // Derivation path. First 3 items are automatically hardened!
      const path = "m/44'/7777777'/2147483647'/0/4294967295"
      const resp = app.showAddressAndPubKey(path, 'firma')
      console.log(resp)

      await expect(resp).rejects.toMatchObject({
        returnCode: 0x6989,
        errorMessage: 'Invalid HD Path Value. Expert Mode required.'
      })
    } finally {
      await sim.close()
    }
  })

  test.concurrent.each(DEVICE_MODELS)('show address HUGE Expert', async function (m) {
    const sim = new Zemu(m.path)
    try {
      await sim.start({
        ...defaultOptions,
        model: m.name,
        approveKeyword: isTouchDevice(m.name) ? 'Confirm' : '',
        approveAction: ButtonKind.DynamicTapButton,
      })
      const app = new CosmosApp(sim.getTransport())

      // Activate expert mode
      await sim.toggleExpertMode();

      // Derivation path. First 3 items are automatically hardened!
      const path = "m/44'/7777777'/2147483647'/0/4294967295"
      const respRequest = app.showAddressAndPubKey(path, 'firma')

      // Wait until we are not in the main menu
      await sim.waitUntilScreenIsNot(sim.getMainMenuSnapshot())
      await sim.compareSnapshotsAndApprove('.', `${m.prefix.toLowerCase()}-show_address_huge`)

      const resp = await respRequest
      console.log(resp)

      expect(resp).toHaveProperty('bech32_address')
      expect(resp).toHaveProperty('compressed_pk')

      expect(resp.bech32_address).toMatch(/^firma1/)
      expect(resp.compressed_pk.length).toEqual(33)
    } finally {
      await sim.close()
    }
  })
})
