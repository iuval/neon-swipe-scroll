require 'sinatra'

get '/' do
  erb :"index-vertical"
end

get '/horizontal' do
  erb :"index-horizontal"
end

get '/unity' do
  erb :"index-unity"
end