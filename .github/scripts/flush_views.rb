#!/usr/bin/env ruby
# frozen_string_literal: true

# Applies a tally fetched from the flush-views Netlify function (see
# .github/workflows/flush-views.yml) to _data/views.yml (sitewide monthly
# total, same month-rollover rule as before) and _data/page_views.yml
# (per-page cumulative totals, no month bucketing). Writes nothing if the
# tally is empty, so git-auto-commit-action naturally skips an empty commit.

require "yaml"
require "json"

VIEWS_PATH = File.join(__dir__, "..", "..", "_data", "views.yml")
PAGE_VIEWS_PATH = File.join(__dir__, "..", "..", "_data", "page_views.yml")

flush_result_path = ARGV[0] || abort("usage: flush_views.rb <flush-response.json>")
flush = JSON.parse(File.read(flush_result_path))
delta_total = flush["total"].to_i
delta_pages = flush["pages"] || {}

if delta_total.zero? && delta_pages.empty?
  puts "flush_views: nothing to flush"
  exit 0
end

data = YAML.load_file(VIEWS_PATH) || {}
data["history"] ||= []
data["current_month"] = data["current_month"].to_i
this_month = Time.now.utc.strftime("%Y-%m")

if data["current_month_label"].nil? || data["current_month_label"].to_s.empty?
  data["current_month_label"] = this_month
  data["current_month"] = delta_total
elsif data["current_month_label"] == this_month
  data["current_month"] += delta_total
else
  data["history"] << { "month" => data["current_month_label"], "count" => data["current_month"] }
  data["current_month_label"] = this_month
  data["current_month"] = delta_total
end

File.write(VIEWS_PATH, data.to_yaml)

page_data = YAML.load_file(PAGE_VIEWS_PATH) || {}
page_data["pages"] ||= {}
delta_pages.each do |path, count|
  page_data["pages"][path] = page_data["pages"].fetch(path, 0) + count.to_i
end

File.write(PAGE_VIEWS_PATH, page_data.to_yaml)

puts "flush_views: +#{delta_total} views this month " \
     "(#{data['current_month_label']} => #{data['current_month']}), " \
     "#{delta_pages.size} page(s) updated"
