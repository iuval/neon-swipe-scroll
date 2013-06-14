require 'sinatra'

get '/' do
  erb :"index-vertical"
end

get '/horizontal' do
  erb :"index-horizontal"
end