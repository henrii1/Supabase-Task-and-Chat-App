import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function App() {
  const [count, setCount] = useState(0)
  const [supabaseStatus, setSupabaseStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  const [projectInfo, setProjectInfo] = useState<any>(null)

  useEffect(() => {
    testSupabaseConnection()
  }, [])

  const testSupabaseConnection = async () => {
    try {
      console.log('🧪 Testing Supabase Connection...')
      console.log('Environment Variables:')
      console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL || 'NOT SET')
      console.log('- VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ SET' : '❌ NOT SET')
      
      // Test basic connection
      const { data: { user } } = await supabase.auth.getUser()
      console.log('✅ Auth module working')
      console.log('Current user:', user ? `Logged in as ${user.email}` : 'Anonymous (expected)')
      
      setProjectInfo({
        url: import.meta.env.VITE_SUPABASE_URL,
        hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        userStatus: user ? `Logged in as ${user.email}` : 'Anonymous'
      })
      
      setSupabaseStatus('connected')
      console.log('🎉 Supabase client is properly configured!')
    } catch (error) {
      console.error('❌ Connection test failed:', error)
      setSupabaseStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Supabase Task and Chat App
        </h1>
        <p className="text-gray-600 mb-6">
          Your TypeScript + Tailwind + Supabase project is ready!
        </p>
        
        {/* Supabase Connection Status */}
        <div className="mb-6 p-4 rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-2">🔗 Supabase Connection</h3>
          {supabaseStatus === 'testing' && (
            <div className="text-yellow-600">🧪 Testing connection...</div>
          )}
          {supabaseStatus === 'connected' && (
            <div className="text-green-600">✅ Connected successfully!</div>
          )}
          {supabaseStatus === 'error' && (
            <div className="text-red-600">❌ Connection failed</div>
          )}
          
          {projectInfo && (
            <div className="mt-2 text-sm text-gray-600">
              <p>URL: {projectInfo.url?.substring(0, 30)}...</p>
              <p>API Key: {projectInfo.hasKey ? '✅ Configured' : '❌ Missing'}</p>
              <p>Auth: {projectInfo.userStatus}</p>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Count: {count}
          </button>
          <p className="text-sm text-gray-500">
            Edit <code className="bg-gray-100 px-2 py-1 rounded">src/App.tsx</code> and save to test HMR
          </p>
        </div>
      </div>
    </div>
  )
}

export default App 