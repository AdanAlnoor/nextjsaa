const net = require('net');
const { createClient } = require('@supabase/supabase-js');

// Supabase config
const supabaseUrl = 'https://jrsubdglzxjoqpgbbxbq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyc3ViZGdsenhqb3FwZ2JieGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyNDk0NzQsImV4cCI6MjA1NTgyNTQ3NH0.FzLxZV2mpVRTWVRace_ZskRBPn6gjXGZWvEvwHyUQ8o';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('count');
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
      return false;
    }
    
    console.log('Successfully connected to Supabase:', data);
    return true;
  } catch (err) {
    console.error('Exception connecting to Supabase:', err);
    return false;
  }
}

// Instead of a proxy (which is complex for PostgreSQL protocol),
// we'll just create a simple server that MCP can connect to and
// perform mock responses
const server = net.createServer((socket) => {
  console.log('Client connected');
  
  socket.on('data', (data) => {
    console.log('Received data from client:', data.toString('hex'));
    
    // For PostgreSQL wire protocol, we need to respond with a specific format
    // This is a very simplified mock response
    const response = Buffer.from('52000000080000000000', 'hex');
    socket.write(response);
  });
  
  socket.on('end', () => {
    console.log('Client disconnected');
  });
  
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

// Start server on port 54322
server.listen(54322, '127.0.0.1', async () => {
  console.log('PostgreSQL mock server running on 127.0.0.1:54322');
  
  // Test Supabase connection
  const connected = await testSupabaseConnection();
  if (connected) {
    console.log('Supabase connection test was successful');
  } else {
    console.error('Supabase connection test failed');
  }
});

server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error('Port 54322 is already in use. Close any other postgres instances and try again.');
  }
}); 