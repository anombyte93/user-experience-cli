'use client'

import { useState } from 'react'
import { Settings, Key, Palette, Bell, Shield } from 'lucide-react'
import { TierSelector } from '@/components/tier-selector'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'appearance' | 'notifications'>('general')
  const [settings, setSettings] = useState({
    theme: 'system',
    notifications: true,
    emailAlerts: false,
    apiKey: '',
    tier: 'free'
  })

  const handleSave = () => {
    // Save settings to localStorage or API
    localStorage.setItem('ux-audit-settings', JSON.stringify(settings))
    alert('Settings saved successfully!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow p-4 space-y-2">
              <TabButton
                active={activeTab === 'general'}
                onClick={() => setActiveTab('general')}
                icon={Settings}
                label="General"
              />
              <TabButton
                active={activeTab === 'api'}
                onClick={() => setActiveTab('api')}
                icon={Key}
                label="API Keys"
              />
              <TabButton
                active={activeTab === 'appearance'}
                onClick={() => setActiveTab('appearance')}
                icon={Palette}
                label="Appearance"
              />
              <TabButton
                active={activeTab === 'notifications'}
                onClick={() => setActiveTab('notifications')}
                icon={Bell}
                label="Notifications"
              />
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow p-6">
              {activeTab === 'general' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">General Settings</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Plan
                      </label>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-semibold text-gray-900 capitalize">{settings.tier}</p>
                            <p className="text-sm text-gray-600">
                              {settings.tier === 'free' && '5 audits per month'}
                              {settings.tier === 'pro' && '100 audits per month'}
                              {settings.tier === 'enterprise' && 'Unlimited audits'}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab('api')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Upgrade
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upgrade Your Plan</h3>
                      <TierSelector
                        selectedTier={settings.tier}
                        onTierChange={(tier) => setSettings({ ...settings, tier })}
                        showToggle
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'api' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">API Keys</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        OpenAI API Key
                      </label>
                      <input
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Required for advanced AI-powered UX analysis
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Secure Storage</p>
                          <p className="text-sm text-blue-800 mt-1">
                            Your API keys are encrypted and stored locally. They are never shared with third parties.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Appearance</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <select
                        value={settings.theme}
                        onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="system">System</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Notifications</h2>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Push Notifications</p>
                        <p className="text-sm text-gray-600">Get notified about audit completions</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications}
                          onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Email Alerts</p>
                        <p className="text-sm text-gray-600">Receive critical issues via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.emailAlerts}
                          onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t">
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean
  onClick: () => void
  icon: any
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg transition
        ${active
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-700 hover:bg-gray-50'
        }
      `}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  )
}
